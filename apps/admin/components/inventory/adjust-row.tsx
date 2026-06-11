"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustInventoryAction } from "@/lib/inventory-actions";

/**
 * Inline inventory editor. Instead of stepping +1/-1, the admin types the
 * target on-hand quantity and hits Apply. We translate that absolute number
 * into a signed delta for the (delta-based, movement-logging) server action.
 */
export function AdjustInventoryRow({
  variantId,
  warehouseId,
  onHand,
  reserved,
}: {
  variantId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [value, setValue] = React.useState(String(onHand));
  const [reason, setReason] = React.useState("");

  function start() {
    setValue(String(onHand));
    setReason("");
    setErr(null);
    setOpen(true);
  }

  function apply() {
    const target = Math.floor(Number(value));
    if (!Number.isFinite(target) || target < 0) {
      setErr("Enter a valid quantity");
      return;
    }
    if (target < reserved) {
      setErr(`Cannot go below reserved (${reserved})`);
      return;
    }
    const delta = target - onHand;
    if (delta === 0) {
      setOpen(false);
      return;
    }
    setErr(null);
    startTransition(async () => {
      const send = new FormData();
      send.set("variantId", variantId);
      send.set("warehouseId", warehouseId);
      send.set("delta", String(delta));
      send.set("reason", reason.trim() || "Manual adjustment");
      const res = await adjustInventoryAction(send);
      if (!res.ok) setErr(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start}>
        Adjust
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        className="h-9 w-24"
        aria-label="On-hand quantity"
      />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="h-9 w-44"
        aria-label="Reason"
      />
      <Button type="button" size="sm" disabled={pending} onClick={apply}>
        {pending ? "Applying…" : "Apply"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      {err ? <span className="text-xs text-rose-600">{err}</span> : null}
    </div>
  );
}
