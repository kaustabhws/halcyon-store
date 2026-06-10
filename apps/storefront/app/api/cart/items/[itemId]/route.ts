import { NextResponse } from "next/server";
import { z } from "zod";
import { cartRepo } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart-cookie";
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  const { itemId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const cart = await getOrCreateCart();
  try {
    const updated = await cartRepo.setQuantity({
      cartId: cart.id,
      itemId,
      quantity: parsed.data.quantity,
    });
    return jsonResponse(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { itemId } = await ctx.params;
  const cart = await getOrCreateCart();
  try {
    const updated = await cartRepo.removeItem({ cartId: cart.id, itemId });
    return jsonResponse(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not remove item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
