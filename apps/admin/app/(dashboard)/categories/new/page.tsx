import Link from "next/link";
import { CategoryForm } from "@/components/categories/category-form";

export const metadata = { title: "New category" };

export default function NewCategoryPage() {
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
      <CategoryForm state={{ mode: "create" }} />
    </div>
  );
}
