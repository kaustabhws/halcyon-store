import "server-only";
import { sendEmail } from "@ecom/email/registry";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://store.localhost:3000");

/**
 * Send the order-confirmation email. Looks up the order with the data the
 * template needs in one query; fire-and-forget so it can't block checkout.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true, firstName: true, lastName: true } },
      items: true,
    },
  });
  if (!order || !order.customer.email) return;

  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const itemsText = order.items
    .map((it) => {
      const snap = it.productSnapshot as { name?: string; variantName?: string };
      const name = snap.name ?? "Item";
      const variant = snap.variantName ? ` (${snap.variantName})` : "";
      return `  ${name}${variant} × ${it.quantity} — ${formatPrice(it.totalMinor, order.currency)}`;
    })
    .join("\n");
  const itemsHtml = order.items
    .map((it) => {
      const snap = it.productSnapshot as {
        name?: string;
        variantName?: string;
        imageUrl?: string | null;
      };
      const name = snap.name ?? "Item";
      const variant = snap.variantName ? `<br/><span style="color:#71717a;font-size:13px;">${snap.variantName}</span>` : "";
      const img = snap.imageUrl
        ? `<img src="${snap.imageUrl}" alt="" width="48" height="48" style="border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:12px;"/>`
        : "";
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f4f4f5;">
        <div style="display:flex;align-items:center;flex:1;">${img}<div><strong>${name}</strong>${variant}<br/><span style="color:#71717a;font-size:12px;">Qty ${it.quantity}</span></div></div>
        <div style="font-weight:600;">${formatPrice(it.totalMinor, order.currency)}</div>
      </div>`;
    })
    .join("");

  await sendEmail({
    to: order.customer.email,
    template: "order.confirmed",
    data: {
      orderNumber: order.orderNumber,
      customerName:
        [order.customer.firstName, order.customer.lastName]
          .filter(Boolean)
          .join(" ") || null,
      itemCount,
      totalDisplay: formatPrice(order.totalMinor, order.currency),
      itemsHtml,
      itemsText,
      orderUrl: `${PUBLIC_ORIGIN}/account/orders/${order.id}`,
    },
  });
}
