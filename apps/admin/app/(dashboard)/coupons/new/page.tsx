import Link from "next/link";
import { CouponForm } from "@/components/coupons/coupon-form";

export const metadata = { title: "New coupon" };

export default function NewCouponPage() {
  return (
    <div className="max-w-3xl space-y-6 p-8">
      <header>
        <Link
          href="/coupons"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All coupons
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New coupon
        </h1>
      </header>
      <CouponForm state={{ mode: "create" }} />
    </div>
  );
}
