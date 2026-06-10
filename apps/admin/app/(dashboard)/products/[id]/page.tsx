import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArchiveProductButton } from "@/components/products/archive-button";
import {
  VariantsManager,
  type AttributeOption,
  type VariantRow,
} from "@/components/products/variants-manager";
import { ProductMediaManager } from "@/components/products/media-manager";
import { SpecificationsManager } from "@/components/products/specifications-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  cloudinaryCloudName,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  return p ? { title: p.name } : { title: "Not found" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, attributes] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        specifications: { orderBy: { position: "asc" } },
        variants: {
          include: {
            inventory: { include: { warehouse: true } },
            prices: { take: 1, orderBy: { updatedAt: "desc" } },
            attributes: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
      },
    }),
    prisma.attribute.findMany({
      orderBy: { code: "asc" },
      include: { values: { orderBy: { position: "asc" } } },
    }),
  ]);
  if (!product) notFound();

  const attributeOptions: AttributeOption[] = attributes.map((a) => ({
    id: a.id,
    code: a.code,
    label: a.label,
    kind: a.kind,
    values: a.values.map((v) => ({
      id: v.id,
      value: v.value,
      label: v.label,
      swatchHex: v.swatchHex,
    })),
  }));

  // Attributes actually used by this product's variants. The media manager
  // offers these for image grouping, falling back to all attributes when the
  // product has no variant attributes yet.
  const usedAttributeIds = new Set(
    product.variants.flatMap((v) =>
      v.attributes.map((a) => a.attributeValue.attribute.id),
    ),
  );
  const usedValueIds = new Set(
    product.variants.flatMap((v) => v.attributes.map((a) => a.attributeValue.id)),
  );
  const hasVariantAttrs = usedAttributeIds.size > 0;
  const imageAttributeSource = hasVariantAttrs
    ? attributes.filter((a) => usedAttributeIds.has(a.id))
    : attributes;
  const imageAttributeOptions = imageAttributeSource.map((a) => ({
    id: a.id,
    label: a.label,
    // When the product has variants, only surface the values actually used
    // by those variants (e.g. just Black & White, not every color in the
    // system). With no variants yet, show all of the attribute's values.
    values: a.values
      .filter((v) => !hasVariantAttrs || usedValueIds.has(v.id))
      .map((v) => ({
        id: v.id,
        label: v.label,
        swatchHex: v.swatchHex,
      })),
  }));

  const variantRows: VariantRow[] = product.variants.map((v) => {
    const price = v.prices[0];
    const onHand = v.inventory.reduce((s, i) => s + i.onHand, 0);
    const reserved = v.inventory.reduce((s, i) => s + i.reserved, 0);
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      isDefault: v.isDefault,
      pricePaise: price ? Number(price.amountMinor) : 0,
      compareAtPaise: price?.compareAtAmountMinor ? Number(price.compareAtAmountMinor) : null,
      currency: price?.currency ?? "INR",
      onHand,
      reserved,
      attributeValueIds: v.attributes.map((a) => a.attributeValueId),
    };
  });

  return (
    <div className="space-y-6 p-8">
      <header>
        <Link
          href="/products"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All products
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">/{product.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(product.status)}>{product.status}</Badge>
            <Badge variant="outline">{product.kind}</Badge>
            {product.isFeatured ? <Badge variant="accent">Featured</Badge> : null}
            <Button asChild variant="outline" size="sm">
              <Link href={`/products/${product.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <ArchiveProductButton productId={product.id} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductMediaManager
              productId={product.id}
              useVariantImages={product.useVariantImages}
              imageAttributeId={product.imageAttributeId}
              imageAttributes={imageAttributeOptions}
              media={product.media.map((m) => ({
                id: m.id,
                url: m.url,
                altText: m.altText,
                isPrimary: m.isPrimary,
                attributeValueId: m.attributeValueId,
              }))}
              cloudName={cloudinaryCloudName()}
              cloudinaryConfigured={isCloudinaryConfigured()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row k="Brand" v={product.brand?.name ?? "—"} />
            <Row k="Categories" v={product.categories.map((c) => c.category.name).join(", ") || "—"} />
            <Row k="Has variants" v={product.hasVariants ? "Yes" : "No"} />
            <Row k="Created" v={formatDate(product.createdAt)} />
            <Row k="Updated" v={formatDate(product.updatedAt)} />
            {product.shortDescription ? (
              <Row k="Short description" v={product.shortDescription} />
            ) : null}
            {product.description ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Description
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                  {product.description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <VariantsManager
            productId={product.id}
            productName={product.name}
            variants={variantRows}
            attributes={attributeOptions}
          />
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecificationsManager
            productId={product.id}
            specifications={product.specifications.map((s) => ({
              id: s.id,
              key: s.key,
              value: s.value,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}

function statusVariant(s: string): "success" | "warning" | "default" {
  switch (s) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "warning";
    default:
      return "default";
  }
}
