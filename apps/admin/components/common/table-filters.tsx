"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared list-page filter controls. Every control writes straight to the URL
 * search params — no "Apply" button. They preserve sibling params (so search
 * and status compose) and reset pagination on any change. Server components
 * read the resulting `?q=&status=…` as before.
 *
 * All admin list pages are `force-dynamic`, so `useSearchParams` needs no
 * Suspense boundary here.
 */
function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val == null || val === "") params.delete(key);
        else params.set(key, val);
      }
      // Any filter change invalidates the current page offset.
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );
}

/**
 * Debounced text search. Uncontrolled (defaultValue) so typing never fights a
 * re-render; the debounce pushes `?q=` ~300ms after the last keystroke.
 */
export function SearchInput({
  paramKey = "q",
  placeholder,
  className,
  delay = 300,
}: {
  paramKey?: string;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const searchParams = useSearchParams();
  const update = useParamUpdater();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Input
      type="search"
      name={paramKey}
      defaultValue={searchParams.get(paramKey) ?? ""}
      placeholder={placeholder}
      className={cn("max-w-sm", className)}
      onChange={(e) => {
        const val = e.target.value;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          update({ [paramKey]: val.trim() || null });
        }, delay);
      }}
    />
  );
}

/**
 * Single-select filter that pushes on change. `allValue` is the sentinel for
 * "no filter" (cleared from the URL).
 */
export function FilterSelect({
  paramKey,
  options,
  placeholder,
  allLabel = "All",
  allValue = "__ALL__",
  className,
}: {
  paramKey: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  allLabel?: string;
  allValue?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const update = useParamUpdater();
  const current = searchParams.get(paramKey) ?? allValue;

  return (
    <Select
      value={current}
      onValueChange={(v) =>
        update({ [paramKey]: v === allValue ? null : v })
      }
    >
      <SelectTrigger className={cn("h-9 min-w-44", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Boolean checkbox filter that pushes on toggle. Present in the URL as
 * `?{paramKey}={activeValue}` when on, absent when off.
 */
export function FilterToggle({
  paramKey,
  label,
  activeValue = "1",
}: {
  paramKey: string;
  label: string;
  activeValue?: string;
}) {
  const searchParams = useSearchParams();
  const update = useParamUpdater();
  const checked = searchParams.get(paramKey) === activeValue;

  return (
    <Label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-background px-3 text-sm dark:border-zinc-800">
      <Checkbox
        checked={checked}
        onCheckedChange={(c) =>
          update({ [paramKey]: c === true ? activeValue : null })
        }
      />
      <span>{label}</span>
    </Label>
  );
}
