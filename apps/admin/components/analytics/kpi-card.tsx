import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/analytics";

/**
 * KPI tile with a period-over-period delta. `goodWhenUp=false` flips the
 * color semantics for metrics where an increase is bad (refunds, discounts).
 */
export function KpiCard({
  label,
  value,
  kpi,
  goodWhenUp = true,
}: {
  label: string;
  value: string;
  kpi?: Kpi;
  goodWhenUp?: boolean;
}) {
  const delta = kpi?.deltaPct ?? null;
  const up = delta != null && delta > 0;
  const flat = delta == null || Math.abs(delta) < 0.05;
  const good = flat ? null : up === goodWhenUp;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        {delta != null && !flat ? (
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 text-xs font-medium",
              good ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500",
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}%
            <span className="ml-1 font-normal text-muted-foreground">vs prev</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {flat && kpi ? "No change vs prev" : " "}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
