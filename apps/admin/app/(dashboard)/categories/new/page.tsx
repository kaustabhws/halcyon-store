import Link from "next/link";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/categories/category-form";
import { cloudinaryClientConfig } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const metadata = { title: "New category" };

export default async function NewCategoryPage() {
  const parentOptions = await prisma.category.findMany({
    where: { parentId: null, deletedAt: null },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/categories"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New category</h1>
      </header>
      <CategoryForm
        state={{ mode: "create" }}
        cloudinary={cloudinaryClientConfig()}
        parentOptions={parentOptions}
      />
    </div>
  );
}
