import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/products/product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const [brands, categories, attributes] = await Promise.all([
    prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    prisma.attribute.findMany({
      orderBy: { code: "asc" },
      include: { values: { orderBy: { position: "asc" } } },
    }),
  ]);

  return (
    <div className="space-y-6 p-8">
      <header>
        <Link
          href="/products"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick &ldquo;Single variant&rdquo; for products without options, or
          &ldquo;Multiple variants&rdquo; to generate a matrix of size/color
          combinations in one go.
        </p>
      </header>

      <ProductForm
        brands={brands}
        categories={categories}
        attributes={attributes.map((a) => ({
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
        }))}
        state={{ mode: "create" }}
      />
    </div>
  );
}
