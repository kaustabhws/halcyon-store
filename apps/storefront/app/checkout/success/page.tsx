import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orderRepo } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order placed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const sp = await searchParams;
  if (!sp.orderId) redirect("/account/orders");

  const order = await orderRepo.getOrderDetail(sp.orderId, session.user.id);
  if (!order) redirect("/account/orders");

  return (
    <div className="container-page max-w-2xl py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
        Thank you. Your order is in.
      </h1>
      <p className="mt-3 text-zinc-500">
        Order <span className="font-medium text-foreground">{order.orderNumber}</span> · we&rsquo;ll send updates as it moves.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-background p-6 text-left dark:border-zinc-900">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-zinc-500">Total paid</span>
          <span className="text-lg font-semibold">
            {formatPrice(order.totalMinor, order.currency)}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/account/orders/${order.id}`}>View order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">Keep shopping</Link>
        </Button>
      </div>
    </div>
  );
}
