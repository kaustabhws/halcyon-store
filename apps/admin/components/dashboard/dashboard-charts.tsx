"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(rupees % 100000 === 0 ? 0 : 1)}L`;
  }
  if (rupees >= 1000) {
    return `₹${(rupees / 1000).toFixed(rupees % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₹${Math.round(rupees)}`;
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const revenueConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const ordersConfig = {
  orders: {
    label: "Orders",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function RevenueChart({
  data,
}: {
  data: Array<{ date: string; revenuePaise: number }>;
}) {
  const chartData = data.map((d) => ({
    date: d.date,
    revenue: d.revenuePaise,
  }));

  return (
    <ChartContainer config={revenueConfig} className="h-56 w-full">
      <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={dayLabel}
          minTickGap={28}
        />
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
              labelFormatter={(label) => dayLabel(label as string)}
              formatter={(value, name) => [
                formatINR(Number(value)),
                String(name).replace(/^\w/, (c) => c.toUpperCase()),
              ]}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="natural"
          fill="url(#revenue-fill)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function OrdersChart({
  data,
}: {
  data: Array<{ date: string; orderCount: number }>;
}) {
  const chartData = data.map((d) => ({ date: d.date, orders: d.orderCount }));
  return (
    <ChartContainer config={ordersConfig} className="h-56 w-full">
      <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={dayLabel}
          minTickGap={28}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => dayLabel(label as string)}
            />
          }
        />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
