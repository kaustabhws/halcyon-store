import "server-only";
import { sendEmail } from "@ecom/email/registry";
import type {
  EmailLineItem,
  EmailAddress,
} from "@ecom/email/templates";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000");

type AddressSnapshot = {
  fullName?: string;
  phone?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function toEmailAddress(raw: unknown): EmailAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as AddressSnapshot;
  if (!a.fullName) return null;
  const cityLine = [a.city, a.state, a.postalCode].filter(Boolean).join(", ");
  const lines = [a.line1, a.line2, cityLine, a.country].filter(
    (l): l is string => Boolean(l),
  );
  return { fullName: a.fullName, lines, phone: a.phone ?? null };
}

function fullName(firstName: string | null, lastName: string | null): string | null {
  return [firstName, lastName].filter(Boolean).join(" ") || null;
}

/**
 * Send the order-confirmation email. Loads the order with everything the
 * template needs in one query and passes structured data — the email package
 * owns all presentation. Fire-and-forget so it can't block checkout.
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

  const items: EmailLineItem[] = order.items.map((it) => {
    const snap = it.productSnapshot as {
      name?: string;
      variantName?: string | null;
      imageUrl?: string | null;
    };
    return {
      name: snap.name ?? "Item",
      variantName: snap.variantName ?? null,
      imageUrl: snap.imageUrl ?? null,
      quantity: it.quantity,
      lineTotalDisplay: formatPrice(it.totalMinor, order.currency),
    };
  });

  await sendEmail({
    to: order.customer.email,
    template: "order.confirmed",
    data: {
      orderNumber: order.orderNumber,
      customerName: fullName(order.customer.firstName, order.customer.lastName),
      placedAtDisplay: order.placedAt.toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
      items,
      summary: {
        subtotalDisplay: formatPrice(order.subtotalMinor, order.currency),
        discountDisplay:
          order.discountMinor > 0n
            ? formatPrice(order.discountMinor, order.currency)
            : null,
        shippingDisplay:
          order.shippingMinor > 0n
            ? formatPrice(order.shippingMinor, order.currency)
            : "Free",
        totalDisplay: formatPrice(order.totalMinor, order.currency),
      },
      shippingAddress: toEmailAddress(order.shippingAddress),
      orderUrl: `${PUBLIC_ORIGIN}/account/orders/${order.id}`,
    },
  });
}

/**
 * Welcome a brand-new customer. Called once, right after the Customer row is
 * first created (credentials signup or OAuth first login).
 */
export async function sendWelcomeEmail(customerId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!customer?.email) return;

  await sendEmail({
    to: customer.email,
    template: "account.welcome",
    data: {
      customerName: fullName(customer.firstName, customer.lastName),
      shopUrl: `${PUBLIC_ORIGIN}/shop`,
      categoriesUrl: `${PUBLIC_ORIGIN}/categories`,
      accountUrl: `${PUBLIC_ORIGIN}/account`,
    },
  });
}
