import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CouponForm } from "@/components/coupons/coupon-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit coupon" };

function toLocalInput(d: Date | null): string | null {
  if (!d) return null;
  // datetime-local expects "YYYY-MM-DDTHH:mm" in local time. We render in UTC
  // for predictability across servers; admins can adjust for their timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) notFound();

  return (
    <div className="max-w-3xl space-y-6 p-8">
      <header>
        <Link
          href="/coupons"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All coupons
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{c.code}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Used {c.redemptionsCount} time{c.redemptionsCount === 1 ? "" : "s"}.
        </p>
      </header>
      <CouponForm
        state={{
          mode: "edit",
          couponId: c.id,
          defaults: {
            code: c.code,
            type: c.type,
            value: c.value,
            minSubtotalPaise:
              c.minSubtotalMinor != null ? Number(c.minSubtotalMinor) : null,
            maxRedemptions: c.maxRedemptions ?? null,
            perCustomerLimit: c.perCustomerLimit ?? null,
            validFrom: toLocalInput(c.validFrom),
            validTo: toLocalInput(c.validTo),
            active: c.active,
          },
        }}
      />
    </div>
  );
}
