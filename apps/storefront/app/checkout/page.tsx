import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/cart-cookie";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";

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

        <CheckoutSummary />
      </div>
    </div>
  );
}
