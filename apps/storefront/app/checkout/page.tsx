import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/cart-cookie";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/checkout");
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  const defaultAddress = await prisma.address.findFirst({
    where: { customerId: session.user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="container-page py-12 md:py-20">
      <header className="flex flex-col gap-2">
        <Link href="/cart" className="text-sm text-zinc-500 hover:text-foreground">
          ← Back to bag
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Checkout</h1>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <CheckoutForm
          defaultAddress={
            defaultAddress
              ? {
                  fullName: defaultAddress.fullName,
                  phone: defaultAddress.phone ?? "",
                  line1: defaultAddress.line1,
                  line2: defaultAddress.line2 ?? "",
                  city: defaultAddress.city,
                  state: defaultAddress.state,
                  postalCode: defaultAddress.postalCode,
                }
              : null
          }
        />

        <aside className="h-fit space-y-6 rounded-2xl border border-zinc-200 bg-background p-6 dark:border-zinc-900">
          <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>
          <ul className="space-y-4">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium leading-snug">{item.productName}</p>
                  {item.attributes.length > 0 ? (
                    <p className="text-xs text-zinc-500">
                      {item.attributes.map((a) => a.valueLabel).join(" / ")}
                    </p>
                  ) : item.variantName ? (
                    <p className="text-xs text-zinc-500">{item.variantName}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-zinc-500">Qty {item.quantity}</p>
                </div>
                <p className="self-start text-sm font-semibold">
                  {formatPrice(item.lineTotalMinor, item.currency)}
                </p>
              </li>
            ))}
          </ul>

          <Separator />

          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(cart.subtotalMinor, cart.currency)} />
            <Row label="Shipping" value="Free" subtle />
          </dl>
          <Separator />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-semibold">
              {formatPrice(cart.totalMinor, cart.currency)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={subtle ? "text-zinc-500" : ""}>{value}</dd>
    </div>
  );
}
