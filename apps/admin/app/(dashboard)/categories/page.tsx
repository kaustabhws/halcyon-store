import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteCategoryButton } from "@/components/categories/delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { position: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-zinc-500">{categories.length} active</p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <Plus className="h-4 w-4" /> New category
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/categories/${c.id}/edit`} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.description ? (
                      <p className="text-xs text-zinc-500">{c.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">/{c.slug}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c._count.products}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.position}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" aria-label="Edit">
                        <Link href={`/categories/${c.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteCategoryButton categoryId={c.id} name={c.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
