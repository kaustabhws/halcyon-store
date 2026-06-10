"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustInventoryAction } from "@/lib/inventory-actions";

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

  function adjust(direction: 1 | -1) {
    const form = document.getElementById(`adj-form-${variantId}`) as HTMLFormElement | null;
    if (!form) return;
    const fd = new FormData(form);
    const qty = Math.max(0, Math.floor(Number(fd.get("qty") ?? 0)));
    if (qty === 0) return;
    const reason = String(fd.get("reason") ?? "").trim() || "Manual adjustment";
    setErr(null);
    startTransition(async () => {
      const send = new FormData();
      send.set("variantId", variantId);
      send.set("warehouseId", warehouseId);
      send.set("delta", String(direction * qty));
      send.set("reason", reason);
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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Adjust
      </Button>
    );
  }

  return (
    <form id={`adj-form-${variantId}`} className="flex items-center gap-2">
      <Input
        name="qty"
        type="number"
        min={1}
        defaultValue={1}
        className="h-9 w-20"
        aria-label="Quantity"
      />
      <Input
        name="reason"
        placeholder="Reason"
        className="h-9 w-44"
        aria-label="Reason"
      />
      <Button type="button" size="icon" variant="outline" disabled={pending} onClick={() => adjust(1)} aria-label="Add">
        <Plus className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="outline" disabled={pending || onHand - reserved <= 0} onClick={() => adjust(-1)} aria-label="Subtract">
        <Minus className="h-4 w-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {err ? <span className="text-xs text-rose-600">{err}</span> : null}
    </form>
  );
}
