import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orderRepo } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order detail" };

type Params = { id: string };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const order = await orderRepo.getOrderDetail(id, session.user.id);
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

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/account/orders" className="text-sm text-zinc-500 hover:text-foreground">
            ← All orders
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{order.orderNumber}</h2>
          <p className="text-sm text-zinc-500">
            Placed {new Date(order.placedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>
        <Badge variant="default" className="text-xs">
          {order.status}
        </Badge>
      </header>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Items</h3>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-900">
          {order.items.map((it) => (
            <li key={it.id} className="flex gap-4 p-4">
              <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                {it.imageUrl ? (
                  <Image src={it.imageUrl} alt={it.productName} fill sizes="80px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                <Link href={`/product/${it.productSlug}`} className="text-sm font-medium hover:underline">
                  {it.productName}
                </Link>
                {it.attributes.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {it.attributes.map((a) => (
                      <span
                        key={a.code}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] dark:border-zinc-800"
                      >
                        <span className="text-zinc-500">{a.label}:</span>
                        <span>{a.valueLabel}</span>
                      </span>
                    ))}
                  </div>
                ) : it.variantName ? (
                  <p className="text-xs text-zinc-500">{it.variantName}</p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">SKU {it.sku} · qty {it.quantity}</p>
              </div>
              <p className="self-start text-sm font-semibold">
                {formatPrice(it.totalMinor, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-900">
          <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Shipping address</h3>
          <address className="mt-3 not-italic text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {ship.fullName}<br />
            {ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />
            {ship.city}, {ship.state} {ship.postalCode}<br />
            {ship.country}
            {ship.phone ? <><br />{ship.phone}</> : null}
          </address>
        </section>
        <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-900">
          <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotalMinor, order.currency)} />
            {order.discountMinor > 0n ? (
              <Row label="Discount" value={`- ${formatPrice(order.discountMinor, order.currency)}`} />
            ) : null}
            <Row label="Shipping" value={formatPrice(order.shippingMinor, order.currency)} />
          </dl>
          <Separator className="my-4" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-semibold">{formatPrice(order.totalMinor, order.currency)}</span>
          </div>
        </section>
      </div>

      {order.timeline.length > 0 ? (
        <section>
          <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Timeline</h3>
          <ol className="mt-4 space-y-4 border-l border-zinc-200 pl-6 dark:border-zinc-800">
            {order.timeline.map((ev, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.875rem] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-foreground" />
                <p className="text-sm font-medium">{ev.message ?? ev.type}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(ev.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
