import Link from "next/link";
import { BrandForm } from "@/components/brands/brand-form";

export const metadata = { title: "New brand" };

export default function NewBrandPage() {
  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/brands"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All brands
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New brand</h1>
      </header>
      <BrandForm state={{ mode: "create" }} />
    </div>
  );
}
