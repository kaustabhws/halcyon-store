"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function formatINR(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(rupees % 100000 === 0 ? 0 : 1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(rupees % 1000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(rupees)}`;
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type SeriesPoint = { label: string; revenuePaise: number; orderCount: number };

const revenueConfig = { revenue: { label: "Sales", color: "var(--chart-1)" } } satisfies ChartConfig;
const ordersConfig = { orders: { label: "Orders", color: "var(--chart-2)" } } satisfies ChartConfig;

export function SalesTrendChart({ data }: { data: SeriesPoint[] }) {
  const chartData = data.map((d) => ({ label: d.label, revenue: d.revenuePaise }));
  return (
    <ChartContainer config={revenueConfig} className="h-64 w-full">
      <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => formatINR(Number(v))}
          width={56}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => [formatINR(Number(value)), String(name)]}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="natural"
          fill="url(#sales-fill)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function OrdersTrendChart({ data }: { data: SeriesPoint[] }) {
  const chartData = data.map((d) => ({ label: d.label, orders: d.orderCount }));
  return (
    <ChartContainer config={ordersConfig} className="h-64 w-full">
      <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={32} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/** Donut for categorical breakdowns (order status, payment method). */
export function BreakdownDonut({
  data,
  unit = "count",
}: {
  data: Array<{ name: string; value: number }>;
  unit?: "count" | "money";
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: PALETTE[i % PALETTE.length] }]),
  );
  const fmt = (v: number) => (unit === "money" ? formatINR(v) : String(v));
  if (data.every((d) => d.value === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>;
  }
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-56">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="name" formatter={(v, n) => [fmt(Number(v)), String(n)]} />}
        />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
