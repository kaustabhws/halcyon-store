import Link from "next/link";
import {
  ShoppingBag,
  Package,
  Users,
  IndianRupee,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatNumber, formatDate } from "@/lib/format";
import { getDailyOrderSeries, getTopCategories } from "@/lib/analytics";
import {
  RevenueChart,
  OrdersChart,
} from "@/components/dashboard/dashboard-charts";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    revenueLast30,
    revenuePrev30,
    ordersLast30,
    ordersPrev30,
    customerCount,
    productCount,
    pendingOrders,
    recentOrders,
    lowStock,
    dailySeries,
    topCategories,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalMinor: true },
      where: { placedAt: { gte: last30 }, status: { notIn: ["FAILED", "CANCELLED"] } },
    }),
    prisma.order.aggregate({
      _sum: { totalMinor: true },
      where: {
        placedAt: { gte: prev30Start, lt: last30 },
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
    }),
    prisma.order.count({
      where: { placedAt: { gte: last30 }, status: { notIn: ["FAILED", "CANCELLED"] } },
    }),
    prisma.order.count({
      where: {
        placedAt: { gte: prev30Start, lt: last30 },
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      include: { customer: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.inventoryLevel.findMany({
      where: { onHand: { lte: 5 } },
      take: 5,
      orderBy: { onHand: "asc" },
      include: {
        variant: {
          include: { product: { select: { name: true, slug: true, id: true } } },
        },
      },
    }),
    getDailyOrderSeries(30),
    getTopCategories(30, 5),
  ]);

  const revenue = revenueLast30._sum.totalMinor ?? 0n;
  const prevRevenue = revenuePrev30._sum.totalMinor ?? 0n;
  const revenueDelta = pctChange(Number(prevRevenue), Number(revenue));
  const ordersDelta = pctChange(ordersPrev30, ordersLast30);

  return (
    <div className="space-y-8 p-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-xs text-zinc-500">
          Last 30 days · {formatDate(last30)} to today
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<IndianRupee className="h-4 w-4" />}
          label="Revenue"
          value={formatPrice(revenue)}
          delta={revenueDelta}
        />
        <Stat
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Orders"
          value={formatNumber(ordersLast30)}
          delta={ordersDelta}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Customers"
          value={formatNumber(customerCount)}
        />
        <Stat
          icon={<Package className="h-4 w-4" />}
          label="Active products"
          value={formatNumber(productCount)}
        />
      </div>

      {pendingOrders > 0 ? (
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium">{pendingOrders} pending {pendingOrders === 1 ? "order" : "orders"}</p>
              <p className="text-xs text-zinc-500">
                Confirm payment or cancel from the orders list.
              </p>
            </div>
            <Link
              href="/orders?status=PENDING"
              className="text-sm text-foreground hover:underline"
            >
              Review
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue · last 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={dailySeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders / day</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersChart data={dailySeries} />
          </CardContent>
        </Card>
      </div>

      {topCategories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top categories · last 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {topCategories.map((c) => {
                const max = topCategories[0]?.revenuePaise ?? 1;
                const pct = max === 0 ? 0 : (c.revenuePaise / max) * 100;
                return (
                  <li key={c.slug}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatPrice(BigInt(c.revenuePaise))}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link
              href="/orders"
              className="text-xs text-zinc-500 hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-5 text-sm text-zinc-500">No orders yet.</div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{o.orderNumber}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {o.customer.firstName || o.customer.lastName
                            ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim()
                            : o.customer.email}
                          {" · "}
                          {formatDate(o.placedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(o.totalMinor, o.currency)}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <div className="p-5 text-sm text-zinc-500">All variants healthy.</div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {lowStock.map((l) => (
                  <li key={l.id} className="px-5 py-3">
                    <Link
                      href={`/products/${l.variant.product.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {l.variant.product.name}
                    </Link>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{l.variant.sku}</span>
                      <span className="text-xs font-medium text-rose-600">
                        {l.onHand} on hand
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-zinc-500">
          {icon}
          <span className="text-xs uppercase tracking-widest">{label}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        {typeof delta === "number" ? (
          <p
            className={
              delta >= 0
                ? "mt-1 text-xs text-emerald-600"
                : "mt-1 text-xs text-rose-600"
            }
          >
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs prior 30d
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

function statusVariant(s: string): "default" | "success" | "danger" | "warning" | "info" {
  switch (s) {
    case "DELIVERED":
      return "success";
    case "CONFIRMED":
    case "PROCESSING":
    case "SHIPPED":
      return "info";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "default";
  }
}
