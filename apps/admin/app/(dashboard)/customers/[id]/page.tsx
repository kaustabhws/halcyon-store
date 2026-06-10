import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatPrice, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, email: true },
  });
  return c
    ? { title: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email }
    : { title: "Customer" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { where: { deletedAt: null }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 20,
        include: { items: { select: { quantity: true } } },
      },
      oauthAccounts: true,
    },
  });
  if (!customer) notFound();

  const successfulOrders = customer.orders.filter((o) => o.status !== "FAILED" && o.status !== "CANCELLED");
  const ltv = successfulOrders.reduce((sum, o) => sum + o.totalMinor, 0n);
  const aov =
    successfulOrders.length > 0 ? ltv / BigInt(successfulOrders.length) : 0n;
  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;

  return (
    <div className="space-y-6 p-8">
      <header>
        <Link
          href="/customers"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All customers
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="mt-1 text-sm text-zinc-500">{customer.email}</p>
          </div>
          <Badge variant={customer.status === "ACTIVE" ? "success" : "danger"}>
            {customer.status}
          </Badge>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Orders</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{successfulOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Lifetime value</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{formatPrice(ltv, customer.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Avg. order value</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{formatPrice(aov, customer.currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => {
                  const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/orders/${o.id}`} className="text-sm font-medium hover:underline">
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{itemCount}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatPrice(o.totalMinor, o.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">{formatDate(o.placedAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {customer.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Email" v={customer.email} />
              <Row k="Phone" v={customer.phone ?? "—"} />
              <Row k="Locale" v={customer.locale} />
              <Row k="Currency" v={customer.currency} />
              <Row
                k="Marketing"
                v={customer.marketingOptIn ? "Opted in" : "Opted out"}
              />
              <Row k="Joined" v={formatDate(customer.createdAt)} />
              <Row
                k="Last login"
                v={customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Never"}
              />
              {customer.oauthAccounts.length > 0 ? (
                <Row k="OAuth" v={customer.oauthAccounts.map((a) => a.provider).join(", ")} />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addresses ({customer.addresses.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer.addresses.length === 0 ? (
                <p className="text-zinc-500">No addresses.</p>
              ) : (
                customer.addresses.map((a) => (
                  <div key={a.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{a.fullName}</p>
                      {a.isDefault ? <Badge variant="outline">Default</Badge> : null}
                    </div>
                    <address className="mt-1 not-italic text-xs leading-relaxed text-zinc-500">
                      {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                      {a.city}, {a.state} {a.postalCode}<br />
                      {a.country}
                      {a.phone ? <><br />{a.phone}</> : null}
                    </address>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs uppercase tracking-widest text-zinc-500">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
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
