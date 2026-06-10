import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EditAttributeClient } from "@/components/attributes/edit-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit attribute" };

export default async function EditAttributePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: { values: { orderBy: { position: "asc" } } },
  });
  if (!attribute) notFound();

  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/attributes"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All attributes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{attribute.label}</h1>
      </header>

      <EditAttributeClient
        attribute={{
          id: attribute.id,
          code: attribute.code,
          label: attribute.label,
          kind: attribute.kind,
        }}
        values={attribute.values.map((v) => ({
          id: v.id,
          value: v.value,
          label: v.label,
          swatchHex: v.swatchHex,
          position: v.position,
        }))}
      />
    </div>
  );
}
