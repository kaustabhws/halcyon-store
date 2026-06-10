"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  VariantMatrixBuilder,
  EMPTY_PLAN,
  type AttributeOption,
  type MatrixPlan,
} from "@/components/products/variant-matrix-builder";
import { bulkAddVariantsAction } from "@/lib/product-actions";

export function BulkAddVariantsButton({
  productId,
  productName,
  attributes,
  existingSignatures,
}: {
  productId: string;
  productName?: string;
  attributes: AttributeOption[];
  /** Variants that already exist on the product, as sorted "|"-joined value-id strings. */
  existingSignatures: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<MatrixPlan>(EMPTY_PLAN);
  const [rowCount, setRowCount] = React.useState(0);

  const excludeSet = React.useMemo(
    () => new Set(existingSignatures),
    [existingSignatures],
  );

  function submit() {
    if (rowCount === 0) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set(
        "plan",
        JSON.stringify({
          productId,
          skuPrefix: plan.skuPrefix || "VAR",
          basePricePaise: plan.basePricePaise,
          baseCompareAtPaise: plan.baseCompareAtPaise,
          baseOnHand: plan.baseOnHand,
          selections: plan.selections,
          overrides: plan.overrides,
        }),
      );
      const res = await bulkAddVariantsAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setPlan(EMPTY_PLAN);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Layers /> Generate variants in bulk
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate variants</DialogTitle>
            <DialogDescription>
              Pick attributes and values to add a Cartesian matrix of variants
              in one go. Combinations that already exist on this product are
              skipped automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            <VariantMatrixBuilder
              attributes={attributes}
              productName={productName}
              excludeSignatures={excludeSet}
              onChange={(p, rows) => {
                setPlan(p);
                setRowCount(rows);
              }}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || rowCount === 0}
            >
              <Plus />{" "}
              {pending
                ? "Adding…"
                : rowCount > 0
                  ? `Add ${rowCount} variant${rowCount === 1 ? "" : "s"}`
                  : "Add variants"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
