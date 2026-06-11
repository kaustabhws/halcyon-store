import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import {
  SalesTrendChart,
  OrdersTrendChart,
  BreakdownDonut,
} from "@/components/analytics/analytics-charts";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ExportButton } from "@/components/analytics/export-button";
import { getAnalytics, resolveRange } from "@/lib/analytics";
import { formatPaise, formatNumber, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const GRANULARITY_LABEL = { day: "Daily", week: "Weekly", month: "Monthly" } as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = resolveRange(sp.from, sp.to);
  const a = await getAnalytics(range);
  const k = a.kpis;

  // URL params reflect the inclusive day the user picked (range.to is exclusive).
  const fromStr = toISO(range.from);
  const toStr = toISO(new Date(range.to.getTime() - 86_400_000));

  const maxProductRev = Math.max(1, ...a.topProducts.map((p) => p.revenuePaise));

  return (
    <div className="space-y-6 p-8">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(range.from)} – {formatDate(new Date(range.to.getTime() - 86_400_000))} ·
            compared to the previous period
          </p>
        </div>
        <DateRangePicker from={fromStr} to={toStr} />
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total sales" value={formatPaise(k.totalSales.value)} kpi={k.totalSales} />
        <KpiCard label="Net sales" value={formatPaise(k.netSales.value)} kpi={k.netSales} />
        <KpiCard label="Orders" value={formatNumber(k.orders.value)} kpi={k.orders} />
        <KpiCard label="Avg order value" value={formatPaise(k.aov.value)} kpi={k.aov} />
        <KpiCard label="Units sold" value={formatNumber(k.units.value)} kpi={k.units} />
        <KpiCard label="New customers" value={formatNumber(k.newCustomers.value)} kpi={k.newCustomers} />
        <KpiCard label="Discounts" value={formatPaise(k.discounts.value)} kpi={k.discounts} goodWhenUp={false} />
        <KpiCard label="Refunds" value={formatPaise(k.refunds.value)} kpi={k.refunds} goodWhenUp={false} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Returning customer rate" value={`${a.secondary.returningRate.toFixed(1)}%`} />
        <Stat label="Tax collected" value={formatPaise(a.secondary.taxPaise)} />
        <Stat label="Shipping charged" value={formatPaise(a.secondary.shippingPaise)} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sales over time</CardTitle>
            <Badge variant="outline">{GRANULARITY_LABEL[a.bucketing]}</Badge>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={a.series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Orders over time</CardTitle>
            <Badge variant="outline">{GRANULARITY_LABEL[a.bucketing]}</Badge>
          </CardHeader>
          <CardContent>
            <OrdersTrendChart data={a.series} />
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDonut data={a.byStatus.map((s) => ({ name: titleCase(s.status), value: s.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDonut
              unit="money"
              data={a.byPayment.map((p) => ({ name: titleCase(p.provider), value: p.amountPaise }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Top products</CardTitle>
          <ExportButton
            filename={`top-products_${fromStr}_${toStr}`}
            rows={a.topProducts.map((p) => ({
              Product: p.name,
              Brand: p.brand ?? "",
              Units: p.units,
              "Revenue (INR)": (p.revenuePaise / 100).toFixed(2),
            }))}
          />
        </CardHeader>
        <CardContent className="p-0">
          {a.topProducts.length === 0 ? (
            <Empty />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.topProducts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.brand ? <div className="text-xs text-muted-foreground">{p.brand}</div> : null}
                      <div className="mt-1 h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/70"
                          style={{ width: `${(p.revenuePaise / maxProductRev) * 100}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.units)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPaise(p.revenuePaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Category + brand */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={a.byCategory.map((c) => ({ name: c.name, value: c.revenuePaise }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by brand</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={a.byBrand.map((b) => ({ name: b.name, value: b.revenuePaise }))} />
          </CardContent>
        </Card>
      </div>

      {/* Customers */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Top customers</CardTitle>
          <ExportButton
            filename={`top-customers_${fromStr}_${toStr}`}
            rows={a.topCustomers.map((c) => ({
              Customer: c.name,
              Email: c.email,
              Orders: c.orders,
              "Spend (INR)": (c.spendPaise / 100).toFixed(2),
            }))}
          />
        </CardHeader>
        <CardContent className="p-0">
          {a.topCustomers.length === 0 ? (
            <Empty />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.topCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.orders)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPaise(c.spendPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Coupons + low stock + reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top coupons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {a.topCoupons.length === 0 ? (
              <Empty small />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Uses</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.topCoupons.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.uses}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPaise(c.discountPaise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {a.lowStock.length === 0 ? (
              <Empty small />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.lowStock.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{s.product}</div>
                        <div className="text-xs text-muted-foreground">{s.variant}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={s.onHand === 0 ? "destructive" : "warning"}>{s.onHand}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {a.reviews.avgRating ? a.reviews.avgRating.toFixed(1) : "—"}
              </span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm text-muted-foreground">
                {formatNumber(a.reviews.count)} review{a.reviews.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = a.reviews.distribution[stars - 1] ?? 0;
                const pct = a.reviews.count ? (count / a.reviews.count) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-3 tabular-nums text-muted-foreground">{stars}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function BarList({ items }: { items: { name: string; value: number }[] }) {
  if (items.length === 0) return <Empty small />;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{it.name}</span>
            <span className="tabular-nums text-muted-foreground">{formatPaise(it.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ small }: { small?: boolean }) {
  return (
    <p className={`text-center text-sm text-muted-foreground ${small ? "py-8" : "py-12"}`}>
      No data for this range.
    </p>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
