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
