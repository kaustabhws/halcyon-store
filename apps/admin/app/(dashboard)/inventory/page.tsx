import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdjustInventoryRow } from "@/components/inventory/adjust-row";
import type { Prisma } from "@ecom/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

const PAGE_SIZE = 30;

type Search = { q?: string; lowOnly?: string; page?: string };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = sp.q?.trim();
  const lowOnly = sp.lowOnly === "1";

  const where: Prisma.InventoryLevelWhereInput = {
    ...(lowOnly ? { onHand: { lte: 5 } } : {}),
    ...(q
      ? {
          variant: {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { product: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
        }
      : {}),
  };

  const [rows, totalCount, lowCount] = await Promise.all([
    prisma.inventoryLevel.findMany({
      where,
      orderBy: [{ onHand: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        warehouse: true,
      },
    }),
    prisma.inventoryLevel.count({ where }),
    prisma.inventoryLevel.count({ where: { onHand: { lte: 5 } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "variant" : "variants"} · {lowCount} low
          </p>
        </div>
      </header>

      <form className="flex flex-wrap items-center gap-2" action="/inventory">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search SKU or product name…"
          className="max-w-sm"
        />
        <Label
          htmlFor="lowOnly"
          className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-background px-3 text-sm dark:border-zinc-800"
        >
          <Checkbox id="lowOnly" name="lowOnly" value="1" defaultChecked={lowOnly} />
          <span>Low stock only</span>
        </Label>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Apply
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => {
                const available = l.onHand - l.reserved;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/products/${l.variant.product.id}`} className="text-sm font-medium hover:underline">
                        {l.variant.product.name}
                      </Link>
                      {l.variant.name ? (
                        <p className="text-xs text-zinc-500">{l.variant.name}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.variant.sku}</TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {l.warehouse.code}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {l.onHand <= 0 ? (
                        <span className="text-rose-600">{l.onHand}</span>
                      ) : l.onHand <= 5 ? (
                        <span className="text-amber-600">{l.onHand}</span>
                      ) : (
                        <span>{l.onHand}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-zinc-500">{l.reserved}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{available}</TableCell>
                    <TableCell>
                      <AdjustInventoryRow
                        variantId={l.variantId}
                        warehouseId={l.warehouseId}
                        onHand={l.onHand}
                        reserved={l.reserved}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-500">
                    No inventory rows found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PagerLink page={page - 1} disabled={page <= 1} q={q} lowOnly={lowOnly} label="Previous" />
            <PagerLink page={page + 1} disabled={page >= totalPages} q={q} lowOnly={lowOnly} label="Next" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PagerLink({
  page,
  disabled,
  q,
  lowOnly,
  label,
}: {
  page: number;
  disabled: boolean;
  q?: string;
  lowOnly: boolean;
  label: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (lowOnly) params.set("lowOnly", "1");
  params.set("page", String(page));
  return (
    <Link
      href={disabled ? "#" : `/inventory?${params.toString()}`}
      aria-disabled={disabled}
      className={
        disabled
          ? "pointer-events-none rounded-md border px-3 py-1.5 opacity-40"
          : "rounded-md border px-3 py-1.5 hover:bg-muted"
      }
    >
      {label}
    </Link>
  );
}
