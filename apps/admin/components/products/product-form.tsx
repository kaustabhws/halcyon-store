"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "@/lib/product-actions";
import {
  VariantMatrixBuilder,
  EMPTY_PLAN,
  type AttributeOption,
  type MatrixPlan,
} from "@/components/products/variant-matrix-builder";

type CreateMode = { mode: "create" };
type EditMode = {
  mode: "edit";
  productId: string;
  defaults: {
    name: string;
    slug: string;
    brandId: string | null;
    categoryId: string | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    kind:
      | "PHYSICAL"
      | "DIGITAL"
      | "SERVICE"
      | "SUBSCRIPTION"
      | "BUNDLE"
      | "KIT"
      | "COURSE";
    isFeatured: boolean;
    shortDescription: string | null;
    description: string | null;
  };
};

export function ProductForm({
  brands,
  categories,
  attributes = [],
  state,
}: {
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  attributes?: AttributeOption[];
  state: CreateMode | EditMode;
}) {
  const isEdit = state.mode === "edit";

  const [formState, formAction, pending] = useActionState<
    ProductFormState | undefined,
    FormData
  >(isEdit ? updateProductAction : createProductAction, undefined);

  const [variantMode, setVariantMode] = React.useState<"single" | "matrix">(
    "single",
  );
  const [matrixPlan, setMatrixPlan] = React.useState<MatrixPlan>(EMPTY_PLAN);
  const [matrixRows, setMatrixRows] = React.useState(0);
  // Track the product name so the variant builder can auto-derive SKUs.
  const [productName, setProductName] = React.useState(
    isEdit ? state.defaults.name : "",
  );

  const variantPlanJson = React.useMemo(
    () => JSON.stringify(matrixPlan),
    [matrixPlan],
  );

  return (
    <form action={formAction} className="space-y-6">
      {isEdit ? (
        <input type="hidden" name="productId" value={state.productId} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Section title="Details">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={isEdit ? state.defaults.name : ""}
                onChange={(e) => setProductName(e.target.value)}
              />
              <FieldError messages={formState?.fieldErrors?.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                defaultValue={isEdit ? state.defaults.slug : ""}
                placeholder="lowercase-with-dashes"
              />
              <FieldError messages={formState?.fieldErrors?.slug} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortDescription">Short description</Label>
              <Input
                id="shortDescription"
                name="shortDescription"
                defaultValue={
                  isEdit ? state.defaults.shortDescription ?? "" : ""
                }
                placeholder="One line. Shown on cards."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={isEdit ? state.defaults.description ?? "" : ""}
              />
            </div>
          </Section>

          {!isEdit ? (
            <Section title="Variants">
              <input type="hidden" name="variantMode" value={variantMode} />
              {variantMode === "matrix" ? (
                <input
                  type="hidden"
                  name="variantPlan"
                  value={variantPlanJson}
                />
              ) : null}

              <RadioGroup
                value={variantMode}
                onValueChange={(v) =>
                  setVariantMode(v === "matrix" ? "matrix" : "single")
                }
                className="grid gap-3 sm:grid-cols-2"
              >
                <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-data-[state=checked]:border-foreground/40 has-data-[state=checked]:bg-card">
                  <RadioGroupItem value="single" />
                  <div>
                    <p className="text-sm font-medium">Single variant</p>
                    <p className="text-xs text-muted-foreground">
                      One SKU, one price, one stock count. Good for products
                      without options (e.g. a football).
                    </p>
                  </div>
                </Label>
                <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-data-[state=checked]:border-foreground/40 has-data-[state=checked]:bg-card">
                  <RadioGroupItem value="matrix" />
                  <div>
                    <p className="text-sm font-medium">Multiple variants</p>
                    <p className="text-xs text-muted-foreground">
                      Pick attributes (e.g. Color, Size). One row per
                      combination is generated automatically.
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              {variantMode === "single" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" required placeholder="ABC-001" />
                    <FieldError messages={formState?.fieldErrors?.sku} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="onHand">Initial stock</Label>
                    <Input
                      id="onHand"
                      name="onHand"
                      type="number"
                      min={0}
                      defaultValue={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pricePaise">Price (paise)</Label>
                    <Input
                      id="pricePaise"
                      name="pricePaise"
                      type="number"
                      min={0}
                      required
                      placeholder="999900 = ₹9,999"
                    />
                    <FieldError messages={formState?.fieldErrors?.pricePaise} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="compareAtPaise">Compare-at (optional)</Label>
                    <Input
                      id="compareAtPaise"
                      name="compareAtPaise"
                      type="number"
                      min={0}
                      placeholder="Strikethrough"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <VariantMatrixBuilder
                    attributes={attributes}
                    productName={productName}
                    onChange={(plan, rows) => {
                      setMatrixPlan(plan);
                      setMatrixRows(rows);
                    }}
                  />
                  {matrixRows === 0 ? (
                    <Alert>
                      <AlertDescription>
                        Configure at least one variant before submitting.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              )}
            </Section>
          ) : null}

          {!isEdit ? (
            <div className="rounded-md border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
              Upload product images on the detail page after creation — the
              Cloudinary uploader handles direct uploads.
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Section title="Status">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={isEdit ? state.defaults.status : "DRAFT"}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">Kind</Label>
              <Select
                name="kind"
                defaultValue={isEdit ? state.defaults.kind : "PHYSICAL"}
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL">Physical</SelectItem>
                  <SelectItem value="DIGITAL">Digital</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  <SelectItem value="BUNDLE">Bundle</SelectItem>
                  <SelectItem value="KIT">Kit</SelectItem>
                  <SelectItem value="COURSE">Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                name="isFeatured"
                defaultChecked={isEdit && state.defaults.isFeatured}
              />
              Featured on storefront
            </Label>
          </Section>

          <Section title="Organization">
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                name="categoryId"
                defaultValue={isEdit ? state.defaults.categoryId ?? "" : ""}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError messages={formState?.fieldErrors?.categoryId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brandId">Brand</Label>
              <Select
                name="brandId"
                defaultValue={isEdit ? state.defaults.brandId ?? "__none" : "__none"}
              >
                <SelectTrigger id="brandId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No brand</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>
        </div>
      </div>

      {formState?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      ) : formState?.ok ? (
        <Alert>
          <AlertDescription>Saved.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending || (!isEdit && variantMode === "matrix" && matrixRows === 0)}
        >
          {pending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : variantMode === "matrix" && matrixRows > 0
                ? `Create product with ${matrixRows} variant${matrixRows === 1 ? "" : "s"}`
                : "Create product"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={isEdit ? `/products/${state.productId}` : "/products"}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border bg-card p-5">
      <legend className="px-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
