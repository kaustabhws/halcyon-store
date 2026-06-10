import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderActions } from "@/components/orders/order-actions";
import { formatPrice, formatDateTime, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, select: { orderNumber: true } });
  return o ? { title: o.orderNumber } : { title: "Order not found" };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { variant: { include: { product: { select: { id: true, slug: true, name: true } } } } },
      },
      timeline: { orderBy: { createdAt: "asc" } },
      paymentIntents: true,
      paymentTransactions: { orderBy: { createdAt: "desc" } },
      fulfillments: { include: { shipments: true } },
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const ship = order.shippingAddress as {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  const refundable =
    order.status !== "REFUNDED" &&
    order.paymentTransactions.some((t) => t.kind === "CAPTURE" && t.status === "CAPTURED");

  return (
    <div className="space-y-6 p-8">
      <header>
        <Link
          href="/orders"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← All orders
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Placed {formatDateTime(order.placedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
            <Badge variant="outline">{order.fulfillmentStatus}</Badge>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            refundable={refundable}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {order.items.map((it) => {
                const snap = it.productSnapshot as {
                  slug: string;
                  name: string;
                  imageUrl: string | null;
                  sku: string;
                  variantName: string | null;
                  attributes?: Array<{
                    code: string;
                    label: string;
                    value: string;
                    valueLabel: string;
                  }>;
                };
                const attrs = snap.attributes ?? [];
                return (
                  <li key={it.id} className="flex items-start gap-4 p-5">
                    <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {snap.imageUrl ? (
                        <Image src={snap.imageUrl} alt={snap.name} fill sizes="64px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${it.variant.product.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {snap.name}
                      </Link>
                      {snap.variantName ? (
                        <p className="text-xs text-muted-foreground">{snap.variantName}</p>
                      ) : null}
                      {attrs.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {attrs.map((a) => (
                            <span
                              key={a.code}
                              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]"
                            >
                              <span className="text-muted-foreground">{a.label}:</span>
                              <span>{a.valueLabel}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        SKU {snap.sku} · qty {it.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatPrice(it.totalMinor, order.currency)}
                      </p>
                      <p className="text-xs text-zinc-500 tabular-nums">
                        {formatPrice(it.unitPriceMinor, order.currency)} each
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {[order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email}
              </p>
              <p className="text-xs text-zinc-500">{order.customer.email}</p>
              {order.customer.phone ? (
                <p className="text-xs text-zinc-500">{order.customer.phone}</p>
              ) : null}
              <p className="pt-2 text-xs text-zinc-500">
                Member since {formatDate(order.customer.createdAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <address className="text-sm not-italic leading-relaxed text-zinc-700 dark:text-zinc-300">
                {ship.fullName}<br />
                {ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />
                {ship.city}, {ship.state} {ship.postalCode}<br />
                {ship.country}
                {ship.phone ? <><br />{ship.phone}</> : null}
              </address>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotalMinor, order.currency)} />
              {order.discountMinor > 0n ? (
                <Row label="Discount" value={`- ${formatPrice(order.discountMinor, order.currency)}`} />
              ) : null}
              <Row label="Shipping" value={formatPrice(order.shippingMinor, order.currency)} />
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatPrice(order.totalMinor, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {order.paymentTransactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {order.paymentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-mono text-xs">{t.providerTxnId}</p>
                    <p className="text-xs text-zinc-500">
                      {t.provider} · {t.kind} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={t.status === "CAPTURED" ? "success" : "default"}>
                      {t.status}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatPrice(t.amountMinor, t.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {order.refunds.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Refunds</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {order.refunds.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div>
                    <p>{r.reason ?? "Refund"}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={r.status === "SUCCEEDED" ? "success" : "warning"}>
                      {r.status}
                    </Badge>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(r.amountMinor, r.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {order.timeline.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 border-l border-zinc-200 pl-6 dark:border-zinc-800">
              {order.timeline.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[1.875rem] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-foreground" />
                  <p className="text-sm font-medium">{ev.message ?? ev.type}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(ev.createdAt)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
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
