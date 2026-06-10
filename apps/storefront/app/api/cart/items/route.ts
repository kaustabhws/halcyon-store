import { NextResponse } from "next/server";
import { z } from "zod";
import { cartRepo } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart-cookie";
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

export async function GET() {
  const cart = await getOrCreateCart();
  return jsonResponse(cart, {
    headers: { "Cache-Control": "no-store" },
  });
}

const AddItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const cart = await getOrCreateCart();

  try {
    const updated = await cartRepo.addToCart({
      cartId: cart.id,
      variantId: parsed.data.variantId,
      quantity: parsed.data.quantity,
    });
    return jsonResponse(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not add to cart";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
