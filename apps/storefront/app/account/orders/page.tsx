import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orderRepo } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { items, totalCount, pageSize } = await orderRepo.listOrdersForCustomer(
    session.user.id,
    { page, pageSize: 10 },
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-muted p-12 text-center dark:border-zinc-800">
        <p className="text-sm font-medium">No orders yet.</p>
        <p className="mt-2 text-sm text-zinc-500">When you place an order, it&rsquo;ll show up here.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the shelf</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-900">
        {items.map((o) => (
          <li key={o.id}>
            <Link
              href={`/account/orders/${o.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-muted"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{o.orderNumber}</p>
                  <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(o.placedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} ·{" "}
                  {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <p className="text-right text-sm font-semibold">
                {formatPrice(o.totalMinor, o.currency)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PagerLink href={page > 1 ? `/account/orders?page=${page - 1}` : null} label="Previous" />
            <PagerLink href={page < totalPages ? `/account/orders?page=${page + 1}` : null} label="Next" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusVariant(s: string): "default" | "success" | "danger" | "outline" {
  switch (s) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "PENDING":
      return "outline";
    default:
      return "default";
  }
}

function PagerLink({ href, label }: { href: string | null; label: string }) {
  return (
    <Link
      href={href ?? "#"}
      aria-disabled={!href}
      className={
        href
          ? "rounded-full border px-4 py-2 hover:bg-muted"
          : "pointer-events-none rounded-full border px-4 py-2 opacity-40"
      }
    >
      {label}
    </Link>
  );
}
