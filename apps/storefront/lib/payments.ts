import {
  PaymentGatewayRegistry,
  type IPaymentGateway,
} from "@ecom/payments";
import { RazorpayGateway } from "@ecom/payments/razorpay";

let cached: PaymentGatewayRegistry | null = null;

/**
 * Lazy-build a registry once per process. Razorpay env vars are validated
 * at first use rather than at import time so build-time prerender still
 * works without secrets.
 */
export function getPaymentRegistry(): PaymentGatewayRegistry {
  if (cached) return cached;
  const reg = new PaymentGatewayRegistry();

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (keyId && keySecret && webhookSecret) {
    reg.register(new RazorpayGateway({ keyId, keySecret, webhookSecret }));
  }

  cached = reg;
  return reg;
}

export function getRazorpay(): IPaymentGateway {
  return getPaymentRegistry().get("razorpay");
}

export function razorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
  );
}
