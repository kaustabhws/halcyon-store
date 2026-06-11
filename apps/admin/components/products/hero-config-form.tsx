"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { setHeroConfigAction } from "@/lib/featured-actions";
import {
  HERO_DESIGNS,
  HERO_DESIGN_LABELS,
  HERO_DESIGNS_USING_PRODUCT,
  type HeroConfig,
  type HeroDesign,
  type HeroText,
} from "@ecom/shared/hero";

type ProductOption = {
  id: string;
  name: string;
  brandName: string | null;
};

const NONE_VALUE = "__none__";

const TEXT_FIELDS: Array<{
  key: keyof HeroText;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { key: "eyebrow", label: "Eyebrow", placeholder: "New season" },
  { key: "headlineLead", label: "Headline", placeholder: "The shelf," },
  {
    key: "headlineEmphasis",
    label: "Headline (emphasis)",
    placeholder: "curated.",
  },
  { key: "subtext", label: "Subtext", placeholder: "Short supporting line…", multiline: true },
  { key: "primaryLabel", label: "Primary button label", placeholder: "Shop the shelf" },
  { key: "primaryHref", label: "Primary button link", placeholder: "/shop" },
  { key: "secondaryLabel", label: "Secondary button label", placeholder: "New arrivals" },
  { key: "secondaryHref", label: "Secondary button link", placeholder: "/shop/sneakers" },
];

export function HeroConfigForm({
  products,
  initial,
}: {
  products: ProductOption[];
  initial: HeroConfig;
}) {
  const router = useRouter();
  const [design, setDesign] = React.useState<HeroDesign>(initial.design);
  const [productId, setProductId] = React.useState(initial.productId ?? "");
  const [text, setText] = React.useState<HeroText>(initial.text);
  const [pending, startTransition] = React.useTransition();

  const usesProduct = HERO_DESIGNS_USING_PRODUCT.includes(design);
  const usesText = !usesProduct; // text + minimal

  function setField(key: keyof HeroText, value: string) {
    setText((t) => ({ ...t, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("config", JSON.stringify({ design, productId, text }));
      const res = await setHeroConfigAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Homepage hero updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>Hero design</Label>
        <Select value={design} onValueChange={(v) => setDesign(v as HeroDesign)}>
          <SelectTrigger className="w-full sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HERO_DESIGNS.map((d) => (
              <SelectItem key={d} value={d}>
                {HERO_DESIGN_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {usesProduct
            ? "Showcases the selected hero product's image. Falls back to the text below if no product is set."
            : "A typography-led hero using the editable text below."}
        </p>
      </div>

      {usesProduct ? (
        <div className="space-y-1.5">
          <Label>Hero product</Label>
          <Select
            value={productId || NONE_VALUE}
            onValueChange={(v) => setProductId(v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No hero product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None (use text fallback)</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.brandName ? ` — ${p.brandName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Hero text</p>
          <p className="text-xs text-muted-foreground">
            {usesText
              ? "Shown on the homepage for this design."
              : "Used as the fallback when no hero product is selected."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
              <Label htmlFor={`hero-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              {f.multiline ? (
                <Textarea
                  id={`hero-${f.key}`}
                  rows={2}
                  value={text[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="mt-1.5"
                />
              ) : (
                <Input
                  id={`hero-${f.key}`}
                  value={text[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="mt-1.5"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save hero"}
      </Button>
    </div>
  );
}
