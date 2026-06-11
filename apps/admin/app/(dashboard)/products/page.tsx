import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput, FilterSelect } from "@/components/common/table-filters";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatPrice, formatDate } from "@/lib/format";
import type { Prisma } from "@ecom/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

const PAGE_SIZE = 20;

type Search = { q?: string; status?: string; page?: string };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = sp.q?.trim();
  const status =
    sp.status === "DRAFT" || sp.status === "ACTIVE" || sp.status === "ARCHIVED"
      ? sp.status
      : undefined;

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : {}),
    ...(status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED" ? { status } : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        brand: true,
        media: { take: 1, orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        variants: {
          include: {
            inventory: true,
            prices: { take: 1, orderBy: { updatedAt: "desc" } },
          },
        },
        categories: { include: { category: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "product" : "products"}
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <SearchInput placeholder="Search by name or slug…" />
        <FilterSelect
          paramKey="status"
          placeholder="All statuses"
          allLabel="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "DRAFT", label: "Draft" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                // Compute price range across all variants. Falls back to the
                // default-variant price if no variant has a price row.
                const priceRows = p.variants
                  .map((v) => v.prices[0])
                  .filter((x): x is NonNullable<typeof x> => x != null);
                const amounts = priceRows.map((pr) => pr.amountMinor);
                const minPrice = amounts.length
                  ? amounts.reduce((m, x) => (x < m ? x : m))
                  : null;
                const maxPrice = amounts.length
                  ? amounts.reduce((m, x) => (x > m ? x : m))
                  : null;
                const currency = priceRows[0]?.currency ?? "INR";
                const totalStock = p.variants.reduce(
                  (sum, v) => sum + v.inventory.reduce((s, i) => s + (i.onHand - i.reserved), 0),
                  0,
                );
                const primary = p.media[0];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {primary?.url ? (
                            <Image
                              src={primary.url}
                              alt={primary.altText ?? p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            /{p.slug} · {p.variants.length}{" "}
                            {p.variants.length === 1 ? "variant" : "variants"}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.brand?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {minPrice == null
                        ? "—"
                        : minPrice === maxPrice
                          ? formatPrice(minPrice, currency)
                          : `${formatPrice(minPrice, currency)} – ${formatPrice(maxPrice!, currency)}`}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {totalStock <= 0 ? (
                        <span className="text-rose-600">Out</span>
                      ) : totalStock <= 5 ? (
                        <span className="text-amber-600">{totalStock}</span>
                      ) : (
                        <span>{totalStock}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {formatDate(p.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-zinc-500">
                    No products found.
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
            <PagerLink page={page - 1} disabled={page <= 1} q={q} status={status} label="Previous" />
            <PagerLink page={page + 1} disabled={page >= totalPages} q={q} status={status} label="Next" />
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
  status,
  label,
}: {
  page: number;
  disabled: boolean;
  q?: string;
  status?: string;
  label: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return (
    <Link
      href={disabled ? "#" : `/products?${params.toString()}`}
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

function statusVariant(s: string): "default" | "success" | "warning" {
  switch (s) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "warning";
    default:
      return "default";
  }
}
