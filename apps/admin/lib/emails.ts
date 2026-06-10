import "server-only";
import { sendEmail } from "@ecom/email/registry";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const PUBLIC_ORIGIN =
  process.env.STOREFRONT_URL ?? "http://store.localhost:3000";

const STATUS_MESSAGES: Record<string, { template: "order.shipped" | "order.delivered" | "order.cancelled" | null; message: (orderNumber: string) => string }> = {
  SHIPPED: {
    template: "order.shipped",
    message: (n) => `Your order ${n} just shipped. We'll send tracking info as soon as the carrier scans it.`,
  },
  DELIVERED: {
    template: "order.delivered",
    message: (n) => `Your order ${n} has been delivered. Hope it's everything you wanted.`,
  },
  CANCELLED: {
    template: "order.cancelled",
    message: (n) => `Your order ${n} was cancelled. If anything was charged, it'll be refunded automatically.`,
  },
  CONFIRMED: { template: null, message: () => "" },
  PROCESSING: { template: null, message: () => "" },
  PENDING: { template: null, message: () => "" },
  RETURNED: { template: null, message: () => "" },
  REFUNDED: { template: null, message: () => "" },
  FAILED: { template: null, message: () => "" },
};

/**
 * Send a status-change email when the new status maps to a customer-facing
 * template. Statuses we don't email about (e.g. CONFIRMED, which already
 * fired the order-confirmation email) are no-ops.
 */
export async function sendOrderStatusEmail(
  orderId: string,
  status: string,
): Promise<void> {
  const config = STATUS_MESSAGES[status];
  if (!config?.template) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!order || !order.customer.email) return;

  await sendEmail({
    to: order.customer.email,
    template: config.template,
    data: {
      orderNumber: order.orderNumber,
      customerName:
        [order.customer.firstName, order.customer.lastName]
          .filter(Boolean)
          .join(" ") || null,
      status,
      message: config.message(order.orderNumber),
      orderUrl: `${PUBLIC_ORIGIN}/account/orders/${order.id}`,
    },
  });
}

export async function sendRefundEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!order || !order.customer.email) return;

  await sendEmail({
    to: order.customer.email,
    template: "refund.processed",
    data: {
      orderNumber: order.orderNumber,
      customerName:
        [order.customer.firstName, order.customer.lastName]
          .filter(Boolean)
          .join(" ") || null,
      amountDisplay: formatPrice(order.totalMinor, order.currency),
      orderUrl: `${PUBLIC_ORIGIN}/account/orders/${order.id}`,
    },
  });
}
