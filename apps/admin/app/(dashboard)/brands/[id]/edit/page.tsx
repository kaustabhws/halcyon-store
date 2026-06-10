import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BrandForm } from "@/components/brands/brand-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit brand" };

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/brands"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All brands
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{brand.name}</h1>
      </header>
      <BrandForm
        state={{
          mode: "edit",
          brandId: brand.id,
          defaults: {
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            logoUrl: brand.logoUrl,
          },
        }}
      />
    </div>
  );
}
