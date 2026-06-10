import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

const PAGE_SIZE = 25;

type Search = { q?: string; page?: string };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = sp.q?.trim();

  const where: Prisma.CustomerWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { orders: true } },
        orders: {
          select: { totalMinor: true, currency: true, status: true },
          where: { status: { notIn: ["FAILED", "CANCELLED"] } },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">People</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "customer" : "customers"}
          </p>
        </div>
      </header>

      <form className="flex flex-wrap gap-2" action="/customers">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email…"
          className="max-w-sm"
        />
        <Button
          type="submit"
          className="h-9 rounded-md border border-zinc-200 bg-background px-4 text-sm hover:bg-muted dark:border-zinc-800"
        >
          Apply
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const ltv = c.orders.reduce((sum, o) => sum + o.totalMinor, 0n);
                const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="text-sm font-medium hover:underline">
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{c.email}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{c._count.orders}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatPrice(ltv, c.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                    No customers found.
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
            <PagerLink page={page - 1} disabled={page <= 1} q={q} label="Previous" />
            <PagerLink page={page + 1} disabled={page >= totalPages} q={q} label="Next" />
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
  label,
}: {
  page: number;
  disabled: boolean;
  q?: string;
  label: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return (
    <Link
      href={disabled ? "#" : `/customers?${params.toString()}`}
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
