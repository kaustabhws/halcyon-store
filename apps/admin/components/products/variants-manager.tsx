"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/lib/variant-actions";
import { formatPrice } from "@/lib/format";
import { BulkAddVariantsButton } from "@/components/products/bulk-add-variants";

export type AttributeOption = {
  id: string;
  code: string;
  label: string;
  kind: "LIST" | "TEXT" | "NUMBER" | "SWATCH";
  values: Array<{
    id: string;
    value: string;
    label: string;
    swatchHex: string | null;
  }>;
};

export type VariantRow = {
  id: string;
  sku: string;
  name: string | null;
  isDefault: boolean;
  pricePaise: number;
  compareAtPaise: number | null;
  currency: string;
  onHand: number;
  reserved: number;
  attributeValueIds: string[];
};

type FormDefaults = {
  sku: string;
  name: string;
  pricePaise: string;
  compareAtPaise: string;
  onHand: string;
  isDefault: boolean;
  /** attribute code -> value id */
  attributeSelections: Record<string, string>;
};

const EMPTY_DEFAULTS: FormDefaults = {
  sku: "",
  name: "",
  pricePaise: "",
  compareAtPaise: "",
  onHand: "0",
  isDefault: false,
  attributeSelections: {},
};

function rowToDefaults(
  v: VariantRow,
  attributes: AttributeOption[],
): FormDefaults {
  const selections: Record<string, string> = {};
  for (const attr of attributes) {
    const found = attr.values.find((val) => v.attributeValueIds.includes(val.id));
    if (found) selections[attr.code] = found.id;
  }
  return {
    sku: v.sku,
    name: v.name ?? "",
    pricePaise: String(v.pricePaise),
    compareAtPaise: v.compareAtPaise != null ? String(v.compareAtPaise) : "",
    onHand: "",
    isDefault: v.isDefault,
    attributeSelections: selections,
  };
}

export function VariantsManager({
  productId,
  productName,
  variants,
  attributes,
  currency = "INR",
}: {
  productId: string;
  productName?: string;
  variants: VariantRow[];
  attributes: AttributeOption[];
  currency?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<
    | { mode: "create" }
    | { mode: "edit"; variant: VariantRow }
    | null
  >(null);

  function close() {
    setDialog(null);
    setError(null);
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("productId", productId);
    // Collect selected attribute value IDs across all attribute selects
    const ids: string[] = [];
    for (const attr of attributes) {
      const selected = formData.get(`attr:${attr.code}`);
      if (typeof selected === "string" && selected && selected !== "__none") {
        ids.push(selected);
      }
      formData.delete(`attr:${attr.code}`);
    }
    formData.set("attributeValueIds", ids.join(","));

    startTransition(async () => {
      const res = dialog?.mode === "edit"
        ? await (async () => {
            formData.set("variantId", dialog.variant.id);
            return updateVariantAction(formData);
          })()
        : await createVariantAction(formData);

      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function remove(v: VariantRow) {
    if (!confirm(`Delete variant "${v.sku}"?`)) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("variantId", v.id);
      const res = await deleteVariantAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {variants.length} {variants.length === 1 ? "variant" : "variants"}
          {attributes.length === 0 ? (
            <>
              {" · "}
              <Link href="/attributes" className="underline">
                define attributes
              </Link>{" "}
              to use sizes, colors, etc.
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {attributes.length > 0 ? (
            <BulkAddVariantsButton
              productId={productId}
              productName={productName}
              attributes={attributes}
              existingSignatures={variants.map((v) =>
                [...v.attributeValueIds].sort().join("|"),
              )}
            />
          ) : null}
          <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
            <Plus /> Add variant
          </Button>
        </div>
      </div>

      {error && !dialog ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="px-4 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v) => {
              const attrLabels = attributes
                .map((attr) => {
                  const valueId = v.attributeValueIds.find((id) =>
                    attr.values.some((val) => val.id === id),
                  );
                  if (!valueId) return null;
                  const val = attr.values.find((x) => x.id === valueId);
                  return val ? { attr, val } : null;
                })
                .filter((x): x is NonNullable<typeof x> => x != null);

              return (
                <TableRow key={v.id}>
                  <TableCell className="px-4 font-mono text-xs">{v.sku}</TableCell>
                  <TableCell className="text-sm">
                    {v.name || "—"}
                    {v.isDefault ? (
                      <Badge variant="outline" className="ml-2">
                        Default
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {attrLabels.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        attrLabels.map(({ attr, val }) => (
                          <span
                            key={attr.id}
                            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                          >
                            {val.swatchHex ? (
                              <span
                                className="h-3 w-3 rounded-full border"
                                style={{ background: val.swatchHex }}
                              />
                            ) : null}
                            <span className="text-muted-foreground">{attr.label}:</span>
                            <span>{val.label}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatPrice(BigInt(v.pricePaise), currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{v.onHand}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                    {v.reserved}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDialog({ mode: "edit", variant: v })}
                        aria-label="Edit"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        onClick={() => remove(v)}
                        aria-label="Delete"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No variants yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Edit variant" : "Add variant"}
            </DialogTitle>
            <DialogDescription>
              Pick one value per attribute that applies. Leave attributes blank
              that don&rsquo;t apply (e.g. footballs don&rsquo;t need color).
            </DialogDescription>
          </DialogHeader>

          {dialog ? (
            <VariantForm
              key={dialog.mode === "edit" ? dialog.variant.id : "new"}
              attributes={attributes}
              productName={productName}
              defaults={
                dialog.mode === "edit"
                  ? rowToDefaults(dialog.variant, attributes)
                  : EMPTY_DEFAULTS
              }
              isEdit={dialog.mode === "edit"}
              pending={pending}
              error={error}
              onSubmit={onSubmit}
              onCancel={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function prefixFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) {
    return words[0]!.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .replace(/[^A-Z0-9]/g, "");
}

function VariantForm({
  attributes,
  productName,
  defaults,
  isEdit,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  attributes: AttributeOption[];
  productName?: string;
  defaults: FormDefaults;
  isEdit: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  // Track attribute selections in state so the SKU can auto-generate live.
  const [selections, setSelections] = React.useState<Record<string, string>>(
    defaults.attributeSelections,
  );
  // Which attributes are shown in the form. Start with only the ones that
  // already have a value (edit mode); create mode starts empty and the admin
  // adds attributes via the "Add attribute" picker.
  const [chosenCodes, setChosenCodes] = React.useState<string[]>(
    Object.keys(defaults.attributeSelections),
  );
  const [sku, setSku] = React.useState(defaults.sku);
  // Once the admin edits the SKU by hand we stop auto-overwriting it.
  const [skuDirty, setSkuDirty] = React.useState(isEdit);

  const chosenAttributes = React.useMemo(
    () => chosenCodes.map((c) => attributes.find((a) => a.code === c)).filter(Boolean) as AttributeOption[],
    [chosenCodes, attributes],
  );
  const availableToAdd = React.useMemo(
    () => attributes.filter((a) => !chosenCodes.includes(a.code)),
    [attributes, chosenCodes],
  );

  function addAttribute(code: string) {
    setChosenCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }

  function removeAttribute(code: string) {
    setChosenCodes((prev) => prev.filter((c) => c !== code));
    setSelections((s) => {
      const next = { ...s };
      delete next[code];
      return next;
    });
  }

  const valueByCode = React.useMemo(() => {
    const m = new Map<string, AttributeOption["values"][number]>();
    for (const attr of attributes) {
      for (const v of attr.values) m.set(v.id, v);
    }
    return m;
  }, [attributes]);

  // Auto-generate the SKU from product name + selected values whenever the
  // selection changes — unless the admin has manually edited the field.
  const autoSku = React.useMemo(() => {
    const prefix = prefixFromName(productName ?? "") || "SKU";
    const suffix = attributes
      .map((attr) => {
        const id = selections[attr.code];
        if (!id) return null;
        return valueByCode
          .get(id)
          ?.value.toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 3);
      })
      .filter(Boolean)
      .join("-");
    return suffix ? `${prefix}-${suffix}` : prefix;
  }, [attributes, selections, valueByCode, productName]);

  React.useEffect(() => {
    if (!skuDirty) setSku(autoSku);
  }, [autoSku, skuDirty]);

  return (
    <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 py-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              required
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setSkuDirty(true);
              }}
              placeholder="Auto-generated"
            />
            {!skuDirty ? (
              <p className="text-xs text-muted-foreground">
                Auto-generated from product name + attributes. Edit to override.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaults.name}
              placeholder="Black / Medium"
            />
          </div>
        </div>

        {attributes.length > 0 ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Attributes
              </p>
              {availableToAdd.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-dashed text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add attribute
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {availableToAdd.map((attr) => (
                      <DropdownMenuItem
                        key={attr.id}
                        onSelect={() => addAttribute(attr.code)}
                      >
                        {attr.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            {chosenAttributes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attributes added. Use{" "}
                <span className="font-medium">Add attribute</span> to apply
                color, size, etc. to this variant — or leave empty for a
                product with no options.
              </p>
            ) : (
              <div className="space-y-3">
                {chosenAttributes.map((attr) => (
                  <div key={attr.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`attr-${attr.code}`}>{attr.label}</Label>
                      <Select
                        name={`attr:${attr.code}`}
                        value={selections[attr.code] ?? "__none"}
                        onValueChange={(v) =>
                          setSelections((s) => ({ ...s, [attr.code]: v }))
                        }
                      >
                        <SelectTrigger id={`attr-${attr.code}`}>
                          <SelectValue placeholder="Not applicable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Not applicable</SelectItem>
                          {attr.values.map((val) => (
                            <SelectItem key={val.id} value={val.id}>
                              <span className="inline-flex items-center gap-2">
                                {val.swatchHex ? (
                                  <span
                                    className="h-3 w-3 rounded-full border"
                                    style={{ background: val.swatchHex }}
                                  />
                                ) : null}
                                {val.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttribute(attr.code)}
                      aria-label={`Remove ${attr.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pricePaise">Price (paise)</Label>
            <Input
              id="pricePaise"
              name="pricePaise"
              type="number"
              min={0}
              required
              defaultValue={defaults.pricePaise}
              placeholder="999900 = ₹9,999"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPaise">Compare-at price</Label>
            <Input
              id="compareAtPaise"
              name="compareAtPaise"
              type="number"
              min={0}
              defaultValue={defaults.compareAtPaise}
            />
          </div>
        </div>

        {!isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="onHand">Initial stock</Label>
            <Input
              id="onHand"
              name="onHand"
              type="number"
              min={0}
              defaultValue={defaults.onHand}
            />
            <p className="text-xs text-muted-foreground">
              Adjust stock later from the Inventory page.
            </p>
          </div>
        ) : null}

        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox name="isDefault" defaultChecked={defaults.isDefault} />
          Use as default variant
        </Label>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <DialogFooter className="mt-4 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save variant" : "Add variant"}
        </Button>
      </DialogFooter>
    </form>
  );
}
