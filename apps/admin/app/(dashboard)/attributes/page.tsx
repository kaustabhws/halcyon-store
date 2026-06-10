import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteAttributeButton } from "@/components/attributes/delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attributes" };

export default async function AttributesPage() {
  const attributes = await prisma.attribute.findMany({
    orderBy: { code: "asc" },
    include: {
      values: { orderBy: { position: "asc" } },
      _count: { select: { values: true } },
    },
  });

  return (
    <div className="space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Attributes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define what makes one variant different from another (size, color,
            material, connectivity, etc.). Each attribute has a list of values
            that variants can pick from.
          </p>
        </div>
        <Button asChild>
          <Link href="/attributes/new">
            <Plus /> New attribute
          </Link>
        </Button>
      </header>

      <Card className="py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Label</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Values</TableHead>
                <TableHead className="px-4 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/attributes/${a.id}/edit`}
                      className="text-sm font-medium hover:underline"
                    >
                      {a.label}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.kind}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.values.slice(0, 6).map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                        >
                          {v.swatchHex ? (
                            <span
                              className="h-3 w-3 rounded-full border"
                              style={{ background: v.swatchHex }}
                            />
                          ) : null}
                          {v.label}
                        </span>
                      ))}
                      {a.values.length > 6 ? (
                        <span className="text-xs text-muted-foreground">
                          +{a.values.length - 6}
                        </span>
                      ) : null}
                      {a.values.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No values</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
                        <Link href={`/attributes/${a.id}/edit`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <DeleteAttributeButton attributeId={a.id} name={a.label} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {attributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No attributes yet.
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
