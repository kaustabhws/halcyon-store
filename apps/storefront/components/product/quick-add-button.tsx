"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

/**
 * Adds the given variant to cart and shows a brief confirmation. Used on
 * product cards to skip the PDP for single-variant items.
 *
 * Lives in its own client component so the parent ProductCard can stay a
 * server component for SEO and faster initial paint.
 */
export function QuickAddButton({
  variantId,
  productName,
}: {
  variantId: string;
  productName: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [pending, setPending] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const res = await addItem(variantId, 1);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${productName} added to bag`);
      setJustAdded(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setJustAdded(false), 1500);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={onAdd}
      disabled={pending}
      className="w-full rounded-full shadow-md"
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" /> Added
        </>
      ) : pending ? (
        "Adding…"
      ) : (
        <>
          <Plus className="h-4 w-4" /> Quick add
        </>
      )}
    </Button>
  );
}
