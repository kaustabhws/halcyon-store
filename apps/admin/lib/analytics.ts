import "server-only";
import { prisma } from "@/lib/db";

/**
 * Returns one row per day over the last `days` days (inclusive of today),
 * filling in zero for days with no orders. UTC-bucketed so admin charts
 * are deterministic regardless of where the server runs.
 *
 * `revenuePaise` excludes failed and cancelled orders; counts include
 * everything that wasn't FAILED or CANCELLED.
 */
export type DailyPoint = {
  date: string; // "2026-06-08"
  revenuePaise: number;
  orderCount: number;
};

export async function getDailyOrderSeries(days = 30): Promise<DailyPoint[]> {
  const end = new Date();
  // Anchor to UTC midnight of today, then go back N-1 days.
  const todayUTC = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const start = new Date(todayUTC);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  // Pull every order in the window, then bucket in JS. For the scale this
  // dashboard runs at (a few thousand orders / month), this is fine and
  // avoids a raw SQL detour. If we ever cross 100k orders we'll move to
  // `date_trunc` + `GROUP BY`.
  const orders = await prisma.order.findMany({
    where: {
      placedAt: { gte: start, lt: new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000) },
      status: { notIn: ["FAILED", "CANCELLED"] },
    },
    select: { placedAt: true, totalMinor: true },
  });

  const buckets = new Map<string, { revenuePaise: number; orderCount: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    buckets.set(toISODate(d), { revenuePaise: 0, orderCount: 0 });
  }

  for (const o of orders) {
    const key = toISODate(o.placedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.orderCount += 1;
    bucket.revenuePaise += Number(o.totalMinor);
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    revenuePaise: b.revenuePaise,
    orderCount: b.orderCount,
  }));
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Top categories by revenue over the same window. Uses a single
 * aggregation query joining orderItems → variants → products → categories.
 */
export async function getTopCategories(
  days = 30,
  limit = 5,
): Promise<Array<{ name: string; slug: string; revenuePaise: number }>> {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        placedAt: { gte: start },
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
    },
    select: {
      totalMinor: true,
      variant: {
        select: {
          product: {
            select: {
              categories: {
                select: { category: { select: { name: true, slug: true } } },
              },
            },
          },
        },
      },
    },
  });

  const totals = new Map<string, { name: string; slug: string; revenuePaise: number }>();
  for (const it of items) {
    const cats = it.variant.product.categories;
    if (cats.length === 0) continue;
    // Attribute revenue to all categories the product belongs to. Most
    // products map to one category in this catalog so this is fine.
    const share = Number(it.totalMinor) / cats.length;
    for (const pc of cats) {
      const key = pc.category.slug;
      const existing = totals.get(key);
      if (existing) {
        existing.revenuePaise += share;
      } else {
        totals.set(key, {
          name: pc.category.name,
          slug: key,
          revenuePaise: share,
        });
      }
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.revenuePaise - a.revenuePaise)
    .slice(0, limit)
    .map((c) => ({ ...c, revenuePaise: Math.round(c.revenuePaise) }));
}

/* ===================================================================== */
/* Date-range analytics (the /analytics page)                            */
/* ===================================================================== */

export type Range = { from: Date; to: Date };

const DAY = 24 * 60 * 60 * 1000;
const EXCLUDED = ["FAILED", "CANCELLED"] as const;

/** Resolve a range from URL params, defaulting to the last 30 days. `to` is
 *  made exclusive (end-of-day) so the chosen end date is included. */
export function resolveRange(fromStr?: string, toStr?: string): Range {
  const today = new Date();
  const endUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const parse = (s?: string) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  let from = parse(fromStr);
  let toDay = parse(toStr);
  if (!toDay) toDay = endUTC;
  if (!from) {
    from = new Date(toDay.getTime() - 29 * DAY);
  }
  if (from > toDay) [from, toDay] = [toDay, from];
  // exclusive upper bound = the day after the chosen end date
  return { from, to: new Date(toDay.getTime() + DAY) };
}

/** Equal-length window immediately preceding `from`. */
export function previousRange(range: Range): Range {
  const len = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - len), to: range.from };
}

type SummaryInput = {
  totalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  shippingMinor: bigint;
  customerId: string;
  items: { quantity: number }[];
  refunds: { amountMinor: bigint; status: string }[];
};

function summarize(orders: SummaryInput[]) {
  let salesPaise = 0,
    discountPaise = 0,
    taxPaise = 0,
    shippingPaise = 0,
    refundPaise = 0,
    units = 0;
  for (const o of orders) {
    salesPaise += Number(o.totalMinor);
    discountPaise += Number(o.discountMinor);
    taxPaise += Number(o.taxMinor);
    shippingPaise += Number(o.shippingMinor);
    for (const it of o.items) units += it.quantity;
    for (const r of o.refunds) if (r.status === "SUCCEEDED") refundPaise += Number(r.amountMinor);
  }
  return {
    salesPaise,
    discountPaise,
    taxPaise,
    shippingPaise,
    refundPaise,
    units,
    orders: orders.length,
  };
}

function loadOrders(range: Range) {
  return prisma.order.findMany({
    where: {
      placedAt: { gte: range.from, lt: range.to },
      status: { notIn: [...EXCLUDED] },
    },
    select: {
      id: true,
      placedAt: true,
      couponCode: true,
      totalMinor: true,
      discountMinor: true,
      taxMinor: true,
      shippingMinor: true,
      customerId: true,
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: {
        select: {
          quantity: true,
          totalMinor: true,
          variant: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: { select: { name: true, slug: true } },
                  categories: { select: { category: { select: { name: true, slug: true } } } },
                },
              },
            },
          },
        },
      },
      paymentTransactions: {
        select: { kind: true, provider: true, amountMinor: true, status: true },
      },
      refunds: { select: { amountMinor: true, status: true } },
    },
  });
}

type LoadedOrder = Awaited<ReturnType<typeof loadOrders>>[number];

type Bucketing = "day" | "week" | "month";

function bucketing(range: Range): Bucketing {
  const days = Math.round((range.to.getTime() - range.from.getTime()) / DAY);
  if (days <= 31) return "day";
  if (days <= 92) return "week";
  return "month";
}

function bucketKey(d: Date, by: Bucketing): { key: string; label: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (by === "month") {
    return { key: `${y}-${m}`, label: `${MONTHS[m]} ${y}` };
  }
  if (by === "week") {
    // bucket to the Monday of the week (UTC)
    const dow = (d.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(y, m, day - dow));
    return {
      key: monday.toISOString().slice(0, 10),
      label: `${MONTHS[monday.getUTCMonth()]} ${monday.getUTCDate()}`,
    };
  }
  return { key: `${y}-${m}-${day}`, label: `${MONTHS[m]} ${day}` };
}

export type SeriesPoint = { label: string; revenuePaise: number; orderCount: number };

function salesSeries(orders: LoadedOrder[], range: Range): SeriesPoint[] {
  const by = bucketing(range);
  const buckets = new Map<string, SeriesPoint>();
  // pre-fill buckets across the range so gaps render as zero
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY) {
    const { key, label } = bucketKey(new Date(t), by);
    if (!buckets.has(key)) buckets.set(key, { label, revenuePaise: 0, orderCount: 0 });
  }
  for (const o of orders) {
    const { key } = bucketKey(o.placedAt, by);
    const b = buckets.get(key);
    if (!b) continue;
    b.orderCount += 1;
    b.revenuePaise += Number(o.totalMinor);
  }
  return [...buckets.values()];
}

function topProducts(orders: LoadedOrder[], limit: number) {
  const m = new Map<string, { name: string; brand: string | null; units: number; revenuePaise: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const p = it.variant.product;
      const cur = m.get(p.id) ?? { name: p.name, brand: p.brand?.name ?? null, units: 0, revenuePaise: 0 };
      cur.units += it.quantity;
      cur.revenuePaise += Number(it.totalMinor);
      m.set(p.id, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, limit);
}

function salesByCategory(orders: LoadedOrder[], limit: number) {
  const m = new Map<string, { name: string; revenuePaise: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const cats = it.variant.product.categories;
      if (cats.length === 0) continue;
      const share = Number(it.totalMinor) / cats.length;
      for (const pc of cats) {
        const cur = m.get(pc.category.slug) ?? { name: pc.category.name, revenuePaise: 0 };
        cur.revenuePaise += share;
        m.set(pc.category.slug, cur);
      }
    }
  }
  return [...m.values()]
    .map((c) => ({ ...c, revenuePaise: Math.round(c.revenuePaise) }))
    .sort((a, b) => b.revenuePaise - a.revenuePaise)
    .slice(0, limit);
}

function salesByBrand(orders: LoadedOrder[], limit: number) {
  const m = new Map<string, { name: string; revenuePaise: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const name = it.variant.product.brand?.name ?? "No brand";
      const cur = m.get(name) ?? { name, revenuePaise: 0 };
      cur.revenuePaise += Number(it.totalMinor);
      m.set(name, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, limit);
}

function salesByPayment(orders: LoadedOrder[]) {
  const m = new Map<string, { provider: string; amountPaise: number; count: number }>();
  for (const o of orders) {
    for (const tx of o.paymentTransactions) {
      if (tx.kind !== "CAPTURE") continue;
      const cur = m.get(tx.provider) ?? { provider: tx.provider, amountPaise: 0, count: 0 };
      cur.amountPaise += Number(tx.amountMinor);
      cur.count += 1;
      m.set(tx.provider, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.amountPaise - a.amountPaise);
}

function topCustomers(orders: LoadedOrder[], limit: number) {
  const m = new Map<string, { name: string; email: string; orders: number; spendPaise: number }>();
  for (const o of orders) {
    const c = o.customer;
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
    const cur = m.get(c.id) ?? { name, email: c.email, orders: 0, spendPaise: 0 };
    cur.orders += 1;
    cur.spendPaise += Number(o.totalMinor);
    m.set(c.id, cur);
  }
  return [...m.values()].sort((a, b) => b.spendPaise - a.spendPaise).slice(0, limit);
}

function topCoupons(orders: LoadedOrder[], limit: number) {
  const m = new Map<string, { code: string; uses: number; discountPaise: number }>();
  for (const o of orders) {
    if (!o.couponCode) continue;
    const cur = m.get(o.couponCode) ?? { code: o.couponCode, uses: 0, discountPaise: 0 };
    cur.uses += 1;
    cur.discountPaise += Number(o.discountMinor);
    m.set(o.couponCode, cur);
  }
  return [...m.values()].sort((a, b) => b.discountPaise - a.discountPaise).slice(0, limit);
}

async function ordersByStatus(range: Range) {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { placedAt: { gte: range.from, lt: range.to } },
    _count: { _all: true },
    _sum: { totalMinor: true },
  });
  return rows
    .map((r) => ({
      status: r.status as string,
      count: r._count._all,
      revenuePaise: Number(r._sum.totalMinor ?? 0n),
    }))
    .sort((a, b) => b.count - a.count);
}

async function returningCustomerIds(before: Date): Promise<Set<string>> {
  const rows = await prisma.order.findMany({
    where: { placedAt: { lt: before }, status: { notIn: [...EXCLUDED] } },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  return new Set(rows.map((r) => r.customerId));
}

function countNewCustomers(range: Range): Promise<number> {
  return prisma.customer.count({
    where: { createdAt: { gte: range.from, lt: range.to }, deletedAt: null },
  });
}

export async function getLowStock(threshold = 5, limit = 8) {
  const rows = await prisma.inventoryLevel.findMany({
    where: { onHand: { lte: threshold } },
    orderBy: { onHand: "asc" },
    take: limit,
    select: {
      onHand: true,
      variant: {
        select: { sku: true, name: true, product: { select: { name: true, slug: true } } },
      },
    },
  });
  return rows.map((r) => ({
    product: r.variant.product.name,
    slug: r.variant.product.slug,
    variant: r.variant.name ?? r.variant.sku,
    onHand: r.onHand,
  }));
}

async function getReviewStats(range: Range) {
  const reviews = await prisma.review.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    select: { rating: true },
  });
  const distribution = [0, 0, 0, 0, 0]; // index 0 => 1 star
  let sum = 0;
  for (const r of reviews) {
    const i = Math.min(5, Math.max(1, r.rating)) - 1;
    distribution[i]! += 1;
    sum += r.rating;
  }
  return {
    count: reviews.length,
    avgRating: reviews.length ? sum / reviews.length : 0,
    distribution,
  };
}

export type Kpi = { value: number; prev: number; deltaPct: number | null };
function kpi(value: number, prev: number): Kpi {
  const deltaPct = prev !== 0 ? ((value - prev) / prev) * 100 : value > 0 ? 100 : null;
  return { value, prev, deltaPct };
}

export type AnalyticsResult = Awaited<ReturnType<typeof getAnalytics>>;

/** One call powering the whole /analytics page. */
export async function getAnalytics(range: Range) {
  const prev = previousRange(range);
  const [orders, prevOrders, returningSet, newCust, prevNewCust, byStatus, lowStock, reviews] =
    await Promise.all([
      loadOrders(range),
      loadOrders(prev),
      returningCustomerIds(range.from),
      countNewCustomers(range),
      countNewCustomers(prev),
      ordersByStatus(range),
      getLowStock(5, 8),
      getReviewStats(range),
    ]);

  const cur = summarize(orders);
  const pre = summarize(prevOrders);
  const returningOrders = orders.filter((o) => returningSet.has(o.customerId)).length;

  return {
    range,
    bucketing: bucketing(range),
    kpis: {
      totalSales: kpi(cur.salesPaise, pre.salesPaise),
      netSales: kpi(cur.salesPaise - cur.refundPaise, pre.salesPaise - pre.refundPaise),
      orders: kpi(cur.orders, pre.orders),
      aov: kpi(cur.orders ? cur.salesPaise / cur.orders : 0, pre.orders ? pre.salesPaise / pre.orders : 0),
      units: kpi(cur.units, pre.units),
      newCustomers: kpi(newCust, prevNewCust),
      discounts: kpi(cur.discountPaise, pre.discountPaise),
      refunds: kpi(cur.refundPaise, pre.refundPaise),
    },
    secondary: {
      taxPaise: cur.taxPaise,
      shippingPaise: cur.shippingPaise,
      returningRate: cur.orders ? (returningOrders / cur.orders) * 100 : 0,
    },
    series: salesSeries(orders, range),
    topProducts: topProducts(orders, 10),
    byCategory: salesByCategory(orders, 8),
    byBrand: salesByBrand(orders, 8),
    byPayment: salesByPayment(orders),
    byStatus,
    topCustomers: topCustomers(orders, 8),
    topCoupons: topCoupons(orders, 8),
    lowStock,
    reviews,
  };
}
