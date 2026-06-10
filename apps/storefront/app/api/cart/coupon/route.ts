import { NextResponse } from "next/server";
import { z } from "zod";
import { cartRepo } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart-cookie";
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const ApplySchema = z.object({
  code: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const [cart, session] = await Promise.all([getOrCreateCart(), auth()]);
  const result = await cartRepo.applyCartCoupon({
    cartId: cart.id,
    code: parsed.data.code,
    customerId: session?.user?.id ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return jsonResponse(result.cart);
}

export async function DELETE() {
  const cart = await getOrCreateCart();
  const updated = await cartRepo.removeCartCoupon(cart.id);
  return jsonResponse(updated);
}
