import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/categories/category-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/categories"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{category.name}</h1>
      </header>
      <CategoryForm
        state={{
          mode: "edit",
          categoryId: category.id,
          defaults: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            imageUrl: category.imageUrl,
            position: category.position,
          },
        }}
      />
    </div>
  );
}
