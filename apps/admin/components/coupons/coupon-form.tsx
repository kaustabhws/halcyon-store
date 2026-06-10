"use client";

import { useActionState } from "react";
import * as React from "react";
import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  createCouponAction,
  updateCouponAction,
  type CouponFormState,
} from "@/lib/coupon-actions";

type Defaults = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalPaise: number | null;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
};

type Mode =
  | { mode: "create" }
  | { mode: "edit"; couponId: string; defaults: Defaults };

const EMPTY: Defaults = {
  code: "",
  type: "PERCENT",
  value: 10,
  minSubtotalPaise: null,
  maxRedemptions: null,
  perCustomerLimit: null,
  validFrom: null,
  validTo: null,
  active: true,
};

export function CouponForm({ state }: { state: Mode }) {
  const isEdit = state.mode === "edit";
  const defaults = isEdit ? state.defaults : EMPTY;

  const [type, setType] = React.useState<Defaults["type"]>(defaults.type);

  const [formState, action, pending] = useActionState<
    CouponFormState | undefined,
    FormData
  >(isEdit ? updateCouponAction : createCouponAction, undefined);

  return (
    <form
      action={action}
      className="grid gap-6 rounded-lg border bg-card p-6 lg:grid-cols-2"
    >
      {isEdit ? (
        <input type="hidden" name="couponId" value={state.couponId} />
      ) : null}
      <input type="hidden" name="type" value={type} />

      <div className="space-y-4 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              required
              defaultValue={defaults.code}
              placeholder="WELCOME10"
              autoCapitalize="characters"
            />
            <FieldHint
              hint="Customers type this at checkout. Uppercase letters, digits and dashes."
              error={formState?.fieldErrors?.code?.[0]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type-select">Discount type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Defaults["type"])}>
              <SelectTrigger id="type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">Percent off</SelectItem>
                <SelectItem value="FIXED">Fixed amount off</SelectItem>
                <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {type !== "FREE_SHIPPING" ? (
            <div className="space-y-1.5">
              <Label htmlFor="value">
                {type === "PERCENT" ? "Percent (1–100)" : "Amount (paise)"}
              </Label>
              <Input
                id="value"
                name="value"
                type="number"
                min={type === "PERCENT" ? 1 : 0}
                max={type === "PERCENT" ? 100 : undefined}
                required
                defaultValue={defaults.value}
              />
              <FieldHint error={formState?.fieldErrors?.value?.[0]} />
            </div>
          ) : (
            <input type="hidden" name="value" value={0} />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="minSubtotalPaise">Minimum subtotal (paise)</Label>
            <Input
              id="minSubtotalPaise"
              name="minSubtotalPaise"
              type="number"
              min={0}
              defaultValue={defaults.minSubtotalPaise ?? ""}
              placeholder="No minimum"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="maxRedemptions">Max total uses</Label>
            <Input
              id="maxRedemptions"
              name="maxRedemptions"
              type="number"
              min={1}
              defaultValue={defaults.maxRedemptions ?? ""}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="perCustomerLimit">Max uses per customer</Label>
            <Input
              id="perCustomerLimit"
              name="perCustomerLimit"
              type="number"
              min={1}
              defaultValue={defaults.perCustomerLimit ?? ""}
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="validFrom">Starts</Label>
            <DateTimeField
              id="validFrom"
              name="validFrom"
              defaultValue={defaults.validFrom}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validTo">Ends</Label>
            <DateTimeField
              id="validTo"
              name="validTo"
              defaultValue={defaults.validTo}
              toYear={new Date().getFullYear() + 80}
            />
            <FieldHint error={formState?.fieldErrors?.validTo?.[0]} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch id="active" name="active" defaultChecked={defaults.active} />
          <Label htmlFor="active" className="cursor-pointer">
            Active — customers can use this code
          </Label>
        </div>
      </div>

      {formState?.error ? (
        <Alert variant="destructive" className="lg:col-span-2">
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      ) : formState?.ok ? (
        <Alert className="lg:col-span-2">
          <AlertDescription>Saved.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-2 lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create coupon"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/coupons">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

function FieldHint({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>;
  return null;
}

function DateTimeField({
  id,
  name,
  defaultValue,
  fromYear = 1926,
  toYear = new Date().getFullYear() + 80,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  fromYear?: number;
  toYear?: number;
}) {
  const [value, setValue] = React.useState<Date | undefined>(() => parseLocalDateTime(defaultValue));

  const time = value ? format(value, "HH:mm") : "";
  const hiddenValue = value ? toLocalDateTimeInput(value) : "";

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={hiddenValue} />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between text-left font-normal"
          >
            {value ? format(value, "PPP p") : "Pick date and time"}
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            selected={value}
            onSelect={(d) => setValue(mergeDatePart(value, d))}
          />
          <div className="flex items-center gap-2 border-t p-3">
            <Input
              type="time"
              step={60}
              value={time}
              onChange={(e) => setValue(mergeTimePart(value, e.target.value))}
              className="h-8"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setValue(undefined)}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function parseLocalDateTime(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toLocalDateTimeInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
}

function mergeDatePart(current: Date | undefined, next: Date | undefined): Date | undefined {
  if (!next) return undefined;
  const merged = new Date(next);
  if (current) {
    merged.setHours(current.getHours(), current.getMinutes(), 0, 0);
  } else {
    merged.setHours(0, 0, 0, 0);
  }
  return merged;
}

function mergeTimePart(current: Date | undefined, time: string): Date | undefined {
  if (!time) return current;
  const [rawHour, rawMinute] = time.split(":");
  const hh = Number(rawHour ?? Number.NaN);
  const mm = Number(rawMinute ?? Number.NaN);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return current;

  const base = current ? new Date(current) : new Date();
  base.setSeconds(0, 0);
  base.setHours(hh, mm);
  return base;
}
