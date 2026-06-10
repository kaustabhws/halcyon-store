"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  quickCreateAttributeAction,
  quickCreateValueAction,
} from "@/lib/attribute-actions";

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

export type MatrixOverride = {
  sku?: string;
  pricePaise?: number;
  compareAtPaise?: number | null;
  onHand?: number;
};

export type MatrixPlan = {
  mode: "matrix";
  skuPrefix: string;
  basePricePaise: number;
  baseCompareAtPaise: number | null;
  baseOnHand: number;
  /** attributeId -> list of attributeValueIds */
  selections: Record<string, string[]>;
  /** rowKey -> overrides */
  overrides: Record<string, MatrixOverride>;
};

export const EMPTY_PLAN: MatrixPlan = {
  mode: "matrix",
  skuPrefix: "",
  basePricePaise: 0,
  baseCompareAtPaise: null,
  baseOnHand: 0,
  selections: {},
  overrides: {},
};

function cartesian(
  selections: Record<string, string[]>,
): Array<Record<string, string>> {
  const entries = Object.entries(selections).filter(
    ([, ids]) => ids.length > 0,
  );
  if (entries.length === 0) return [];
  let out: Array<Record<string, string>> = [{}];
  for (const [attrId, valueIds] of entries) {
    const next: Array<Record<string, string>> = [];
    for (const acc of out) {
      for (const valueId of valueIds) {
        next.push({ ...acc, [attrId]: valueId });
      }
    }
    out = next;
  }
  return out;
}

function rowKey(combo: Record<string, string>): string {
  return Object.values(combo).sort().join("|");
}

/**
 * Derive a SKU prefix from the product name: take the first letters of the
 * first three words, e.g. "Wavefront Core Hoodie" → "WCH". Falls back to a
 * cleaned slice of the name.
 */
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

function generatedSku(
  prefix: string,
  combo: Record<string, string>,
  byId: Map<string, AttributeOption["values"][number]>,
  index: number,
): string {
  const cleanPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const suffix = Object.values(combo)
    .map((id) => {
      const v = byId.get(id)?.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      // Keep SKU segments short and readable — 3 chars per value.
      return v?.slice(0, 3);
    })
    .filter(Boolean)
    .join("-");
  return `${cleanPrefix || "SKU"}-${suffix || String(index + 1)}`;
}

export type MatrixBuilderProps = {
  attributes: AttributeOption[];
  /** Product name, used to auto-derive the SKU prefix. */
  productName?: string;
  /** When set, exclude these signatures from the generated rows. Used by
   * the bulk-add dialog to hide combos that already exist on the product. */
  excludeSignatures?: Set<string>;
  initialPlan?: MatrixPlan;
  onChange: (plan: MatrixPlan, rowCount: number) => void;
};

export function VariantMatrixBuilder({
  attributes: initialAttributes,
  productName,
  excludeSignatures,
  initialPlan,
  onChange,
}: MatrixBuilderProps) {
  const router = useRouter();
  // Local attributes list, seeded from props but extendable via inline create.
  const [attributes, setAttributes] =
    React.useState<AttributeOption[]>(initialAttributes);
  React.useEffect(() => {
    setAttributes((prev) => {
      // Merge server-provided attributes with any locally created ones not
      // yet reflected in props (after router.refresh they'll arrive in props).
      const byId = new Map(prev.map((a) => [a.id, a]));
      for (const a of initialAttributes) byId.set(a.id, a);
      return [...byId.values()];
    });
  }, [initialAttributes]);

  const [plan, setPlan] = React.useState<MatrixPlan>(
    initialPlan ??
      (productName
        ? { ...EMPTY_PLAN, skuPrefix: prefixFromName(productName) }
        : EMPTY_PLAN),
  );

  const valueById = React.useMemo(() => {
    const m = new Map<string, AttributeOption["values"][number]>();
    for (const attr of attributes) {
      for (const v of attr.values) m.set(v.id, v);
    }
    return m;
  }, [attributes]);

  const attrById = React.useMemo(() => {
    const m = new Map<string, AttributeOption>();
    for (const a of attributes) m.set(a.id, a);
    return m;
  }, [attributes]);

  const enabledAttributeIds = Object.keys(plan.selections).filter(
    (id) => plan.selections[id]?.length,
  );

  const allCombos = cartesian(plan.selections);
  const visibleCombos = excludeSignatures
    ? allCombos.filter((c) => !excludeSignatures.has(rowKey(c)))
    : allCombos;

  React.useEffect(() => {
    onChange(plan, visibleCombos.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, visibleCombos.length]);

  function toggleAttribute(attrId: string, on: boolean) {
    setPlan((p) => {
      const next = { ...p, selections: { ...p.selections } };
      if (on) {
        next.selections[attrId] = next.selections[attrId] ?? [];
      } else {
        delete next.selections[attrId];
      }
      return next;
    });
  }

  function toggleValue(attrId: string, valueId: string, on: boolean) {
    setPlan((p) => {
      const current = p.selections[attrId] ?? [];
      const updated = on
        ? Array.from(new Set([...current, valueId]))
        : current.filter((id) => id !== valueId);
      const next = { ...p, selections: { ...p.selections, [attrId]: updated } };
      // Drop overrides whose row is no longer in the matrix
      const validKeys = new Set(cartesian(next.selections).map(rowKey));
      const overrides: Record<string, MatrixOverride> = {};
      for (const [k, v] of Object.entries(p.overrides)) {
        if (validKeys.has(k)) overrides[k] = v;
      }
      next.overrides = overrides;
      return next;
    });
  }

  function setOverride(key: string, patch: MatrixOverride) {
    setPlan((p) => {
      const existing = p.overrides[key] ?? {};
      const merged = { ...existing, ...patch };
      for (const k of Object.keys(merged) as Array<keyof MatrixOverride>) {
        if (merged[k] === undefined || merged[k] === "" || merged[k] === null) {
          delete merged[k];
        }
      }
      const overrides = { ...p.overrides };
      if (Object.keys(merged).length === 0) delete overrides[key];
      else overrides[key] = merged;
      return { ...p, overrides };
    });
  }

  // --- Inline create -------------------------------------------------------

  const [creatingAttr, setCreatingAttr] = React.useState(false);
  const [newAttrLabel, setNewAttrLabel] = React.useState("");
  const [savingAttr, setSavingAttr] = React.useState(false);

  async function createAttribute() {
    const label = newAttrLabel.trim();
    if (!label) return;
    setSavingAttr(true);
    try {
      const fd = new FormData();
      fd.set("label", label);
      const res = await quickCreateAttributeAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAttributes((prev) => [...prev, res.attribute]);
      // Auto-enable the freshly created attribute.
      setPlan((p) => ({
        ...p,
        selections: { ...p.selections, [res.attribute.id]: [] },
      }));
      setNewAttrLabel("");
      setCreatingAttr(false);
      router.refresh();
    } finally {
      setSavingAttr(false);
    }
  }

  if (attributes.length === 0 && !creatingAttr) {
    return (
      <div className="space-y-3 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        <p>No attributes yet — create one to start building variants.</p>
        <Button type="button" size="sm" onClick={() => setCreatingAttr(true)}>
          <Plus className="h-4 w-4" /> New attribute
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Pick attributes &amp; values
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {attributes.map((attr) => {
            const enabled = attr.id in plan.selections;
            const selected = plan.selections[attr.id] ?? [];
            return (
              <div
                key={attr.id}
                className={cn(
                  "rounded-md border p-3",
                  enabled ? "border-foreground/40 bg-card" : "bg-muted/40",
                )}
              >
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={enabled}
                    onCheckedChange={(v) => toggleAttribute(attr.id, Boolean(v))}
                  />
                  {attr.label}
                </Label>
                {enabled ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {attr.values.map((v) => {
                        const on = selected.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleValue(attr.id, v.id, !on)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                              on
                                ? "border-foreground bg-foreground text-background"
                                : "hover:bg-muted",
                            )}
                          >
                            {v.swatchHex ? (
                              <span
                                className="h-3 w-3 rounded-full border border-background/30"
                                style={{ background: v.swatchHex }}
                              />
                            ) : null}
                            {v.label}
                            {on ? <Check className="h-3 w-3" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <InlineValueCreator
                      attribute={attr}
                      isSwatch={attr.kind === "SWATCH"}
                      onCreated={(value) => {
                        setAttributes((prev) =>
                          prev.map((a) =>
                            a.id === attr.id
                              ? { ...a, values: [...a.values, value] }
                              : a,
                          ),
                        );
                        // Auto-select the newly created value.
                        toggleValue(attr.id, value.id, true);
                        router.refresh();
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Inline new-attribute */}
        {creatingAttr ? (
          <div className="flex items-end gap-2 rounded-md border p-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-attr" className="text-xs">
                New attribute name
              </Label>
              <Input
                id="new-attr"
                value={newAttrLabel}
                onChange={(e) => setNewAttrLabel(e.target.value)}
                placeholder="e.g. Material"
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createAttribute();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={createAttribute}
              disabled={savingAttr || !newAttrLabel.trim()}
            >
              {savingAttr ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setCreatingAttr(false);
                setNewAttrLabel("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreatingAttr(true)}
          >
            <Plus className="h-4 w-4" /> New attribute
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Defaults applied to every variant
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-skuPrefix">SKU prefix</Label>
            <Input
              id="m-skuPrefix"
              value={plan.skuPrefix}
              onChange={(e) =>
                setPlan((p) => ({ ...p, skuPrefix: e.target.value }))
              }
              placeholder="TSHIRT"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-basePrice">Price (paise)</Label>
            <Input
              id="m-basePrice"
              type="number"
              min={0}
              value={plan.basePricePaise}
              onChange={(e) =>
                setPlan((p) => ({
                  ...p,
                  basePricePaise: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-baseStock">Stock per variant</Label>
            <Input
              id="m-baseStock"
              type="number"
              min={0}
              value={plan.baseOnHand}
              onChange={(e) =>
                setPlan((p) => ({
                  ...p,
                  baseOnHand: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="m-compareAt">Compare-at price (optional)</Label>
            <Input
              id="m-compareAt"
              type="number"
              min={0}
              value={plan.baseCompareAtPaise ?? ""}
              onChange={(e) =>
                setPlan((p) => ({
                  ...p,
                  baseCompareAtPaise: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
              placeholder="Strikethrough price"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Preview
          </p>
          <Badge variant="outline">
            {visibleCombos.length} {visibleCombos.length === 1 ? "variant" : "variants"}
          </Badge>
        </div>
        {enabledAttributeIds.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Enable at least one attribute above to generate variants.
          </div>
        ) : visibleCombos.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {allCombos.length > 0
              ? "Every combination already exists on this product."
              : "Pick at least one value for every enabled attribute."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Variant</th>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-right font-medium">Price (paise)</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {visibleCombos.map((combo, i) => {
                  const key = rowKey(combo);
                  const override = plan.overrides[key];
                  const sku =
                    override?.sku ??
                    generatedSku(plan.skuPrefix, combo, valueById, i);
                  return (
                    <tr key={key} className="border-t">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(combo).map(([attrId, valueId]) => {
                            const attr = attrById.get(attrId);
                            const v = valueById.get(valueId);
                            return (
                              <span
                                key={attrId}
                                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                              >
                                {v?.swatchHex ? (
                                  <span
                                    className="h-3 w-3 rounded-full border"
                                    style={{ background: v.swatchHex }}
                                  />
                                ) : null}
                                <span className="text-muted-foreground">
                                  {attr?.label}:
                                </span>
                                <span>{v?.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={sku}
                          onChange={(e) =>
                            setOverride(key, { sku: e.target.value })
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={override?.pricePaise ?? ""}
                          placeholder={String(plan.basePricePaise)}
                          onChange={(e) =>
                            setOverride(key, {
                              pricePaise: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          className="h-8 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={override?.onHand ?? ""}
                          placeholder={String(plan.baseOnHand)}
                          onChange={(e) =>
                            setOverride(key, {
                              onHand: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          className="h-8 text-right tabular-nums"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          SKU is generated from the product name + values — edit any row to
          override. Leave price/stock blank to use the defaults above.
        </p>
      </div>
    </div>
  );
}

/**
 * Inline "+ add value" control shown under an enabled attribute. Lets the
 * admin add a brand-new value (e.g. a missing size) without leaving the
 * variant builder.
 */
function InlineValueCreator({
  attribute,
  isSwatch,
  onCreated,
}: {
  attribute: AttributeOption;
  isSwatch: boolean;
  onCreated: (value: AttributeOption["values"][number]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [hex, setHex] = React.useState("#000000");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("attributeId", attribute.id);
      fd.set("label", trimmed);
      if (isSwatch) fd.set("swatchHex", hex);
      const res = await quickCreateValueAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onCreated(res.value);
      setLabel("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <Plus className="h-3 w-3" /> Add value
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. XXL"
        className="h-7 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      />
      {isSwatch ? (
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent"
          aria-label="Swatch color"
        />
      ) : null}
      <Button
        type="button"
        size="sm"
        className="h-7"
        onClick={save}
        disabled={saving || !label.trim()}
      >
        {saving ? "…" : "Add"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7"
        onClick={() => {
          setOpen(false);
          setLabel("");
        }}
      >
        ✕
      </Button>
    </div>
  );
}

/** Used by callers to compute the visible-row count without rendering. */
export function countVisibleRows(
  plan: MatrixPlan,
  excludeSignatures?: Set<string>,
): number {
  const all = cartesian(plan.selections);
  return excludeSignatures
    ? all.filter((c) => !excludeSignatures.has(rowKey(c))).length
    : all.length;
}

export { rowKey };
