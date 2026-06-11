"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function presets(): { label: string; from: Date; to: Date }[] {
  const today = new Date();
  return [
    { label: "Today", from: today, to: today },
    { label: "Last 7 days", from: subDays(today, 6), to: today },
    { label: "Last 30 days", from: subDays(today, 29), to: today },
    { label: "Last 90 days", from: subDays(today, 89), to: today },
    { label: "This month", from: startOfMonth(today), to: today },
    {
      label: "Last month",
      from: startOfMonth(subMonths(today, 1)),
      to: endOfMonth(subMonths(today, 1)),
    },
    { label: "This year", from: startOfYear(today), to: today },
  ];
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(`${from}T00:00:00`),
    to: new Date(`${to}T00:00:00`),
  });

  function apply(f: Date, t: Date) {
    setOpen(false);
    router.push(`/analytics?from=${iso(f)}&to=${iso(t)}`);
  }

  const label =
    range?.from && range?.to
      ? `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`
      : "Pick a range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span className="tabular-nums">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-1 border-b p-2 sm:border-b-0 sm:border-r">
            {presets().map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => apply(p.from, p.to)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={range?.from}
              selected={range}
              onSelect={setRange}
            />
            <div className="flex items-center justify-end gap-2 border-t p-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!range?.from || !range?.to}
                onClick={() => range?.from && range?.to && apply(range.from, range.to)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

