import Link from "next/link";
import Image from "next/image";
import { Package, MapPin, ShoppingBag, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { orderRepo, reviewRepo, prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [
    { items: orders, totalCount: orderCount },
    addressCount,
    customer,
    reviewable,
  ] = await Promise.all([
    orderRepo.listOrdersForCustomer(session.user.id, { pageSize: 3 }),
    prisma.address.count({
      where: { customerId: session.user.id, deletedAt: null },
    }),
    prisma.customer.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true, createdAt: true },
    }),
    reviewRepo.listReviewableItemsForCustomer(session.user.id, 6),
  ]);

  return (
    <div className="space-y-12">
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Orders"
          value={orderCount}
          icon={<Package className="h-4 w-4" />}
          href="/account/orders"
        />
        <Stat
          label="Saved addresses"
          value={addressCount}
          icon={<MapPin className="h-4 w-4" />}
          href="/account/addresses"
        />
        <Stat
          label="Member since"
          value={
            customer?.createdAt
              ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                })
              : "—"
          }
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </section>

      {reviewable.length > 0 ? (
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Leave a review
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You bought these — your take helps other customers.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviewable.map((item) => (
              <li
                key={item.orderItemId}
                className="flex gap-3 rounded-2xl border bg-card p-3"
              >
                <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.primaryImageUrl ? (
                    <Image
                      src={item.primaryImageUrl}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.productSlug}#reviews`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {item.productName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ordered{" "}
                    {new Date(item.purchasedAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </p>
                  <Link
                    href={`/product/${item.productSlug}#reviews`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                  >
                    <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" />
                    Write review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent orders</h2>
          <Link
            href="/account/orders"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            See all
          </Link>
        </div>
        <div className="mt-4 divide-y rounded-2xl border">
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            orders.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}{" "}
                    · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatPrice(o.totalMinor, o.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.status}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border bg-card p-6 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
