import Link from "next/link";
import { prisma } from "@/lib/db";
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
export const metadata = { title: "Orders" };

const PAGE_SIZE = 25;

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "FAILED",
] as const;

type Search = { q?: string; status?: string; page?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = sp.q?.trim();
  const rawStatus = sp.status;
  const status =
    rawStatus && STATUSES.includes(rawStatus as (typeof STATUSES)[number])
      ? (rawStatus as (typeof STATUSES)[number])
      : undefined;

  const where: Prisma.OrderWhereInput = {
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customer: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status && STATUSES.includes(status) ? { status } : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Sales</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "order" : "orders"}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <SearchInput placeholder="Order number or customer email…" />
        <FilterSelect
          paramKey="status"
          placeholder="All statuses"
          allLabel="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);
                const name = [o.customer.firstName, o.customer.lastName]
                  .filter(Boolean)
                  .join(" ") || o.customer.email;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="text-sm font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{name}</p>
                      <p className="text-xs text-zinc-500">{o.customer.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{itemCount}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatPrice(o.totalMinor, o.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {formatDate(o.placedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-zinc-500">
                    No orders found.
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
      href={disabled ? "#" : `/orders?${params.toString()}`}
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

function statusVariant(s: string): "default" | "success" | "danger" | "warning" | "info" {
  switch (s) {
    case "DELIVERED":
      return "success";
    case "CONFIRMED":
    case "PROCESSING":
    case "SHIPPED":
      return "info";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "default";
  }
}
