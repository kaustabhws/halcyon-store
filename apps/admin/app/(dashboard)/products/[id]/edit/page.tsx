import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/products/product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, brands, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { categories: true },
    }),
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
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6 p-8">
      <header>
        <Link
          href={`/products/${product.id}`}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Back to product
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Variants, pricing and stock are managed on the product detail page.
        </p>
      </header>

      <ProductForm
        brands={brands}
        categories={categories}
        state={{
          mode: "edit",
          productId: product.id,
          defaults: {
            name: product.name,
            slug: product.slug,
            brandId: product.brandId,
            categoryId: product.categories[0]?.categoryId ?? null,
            status: product.status,
            kind: product.kind,
            isFeatured: product.isFeatured,
            shortDescription: product.shortDescription,
            description: product.description,
          },
        }}
      />
    </div>
  );
}
