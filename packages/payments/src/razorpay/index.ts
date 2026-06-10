import Razorpay from "razorpay";
import crypto from "node:crypto";
import type {
  CaptureInput,
  CreateIntentInput,
  IPaymentGateway,
  IntentResult,
  RefundInput,
  TxnResult,
  VerifiedWebhookEvent,
} from "../index.ts";

export interface RazorpayGatewayOptions {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

/**
 * Razorpay implementation of IPaymentGateway. Server-side only; never bundle.
 *
 * - createIntent → `orders.create` on Razorpay
 * - capture     → `payments.capture`
 * - refund      → `payments.refund`
 * - verifyWebhook → HMAC-SHA256 of raw body against webhookSecret
 */
export class RazorpayGateway implements IPaymentGateway {
  readonly code = "razorpay" as const;
  private readonly client: Razorpay;
  private readonly keyId: string;
  private readonly webhookSecret: string;

  constructor(opts: RazorpayGatewayOptions) {
    this.client = new Razorpay({ key_id: opts.keyId, key_secret: opts.keySecret });
    this.keyId = opts.keyId;
    this.webhookSecret = opts.webhookSecret;
  }

  async createIntent(input: CreateIntentInput): Promise<IntentResult> {
    const rzpOrder = await this.client.orders.create({
      amount: Number(input.amount.amountMinor),
      currency: input.amount.currency,
      receipt: input.orderId,
      notes: input.notes,
      // Razorpay uses receipt for our orderId; idempotencyKey lives in our DB.
    });

    return {
      providerIntentId: rzpOrder.id,
      status: "requires_action",
      clientPayload: {
        keyId: this.keyId,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
    };
  }

  async capture(input: CaptureInput): Promise<TxnResult> {
    if (!input.amount) throw new Error("Razorpay capture requires amount");
    const res = await this.client.payments.capture(
      input.providerIntentId,
      Number(input.amount.amountMinor),
      input.amount.currency,
    );
    return {
      providerTxnId: res.id,
      status: res.status === "captured" ? "captured" : "processing",
      raw: res as unknown as Record<string, unknown>,
    };
  }

  async refund(input: RefundInput): Promise<TxnResult> {
    const res = await this.client.payments.refund(input.providerTxnId, {
      amount: Number(input.amount.amountMinor),
      notes: input.reason ? { reason: input.reason } : undefined,
      receipt: input.idempotencyKey,
    });
    return {
      providerTxnId: res.id,
      status: "refunded",
      raw: res as unknown as Record<string, unknown>,
    };
  }

  async retrieve(providerIntentId: string): Promise<IntentResult> {
    const order = await this.client.orders.fetch(providerIntentId);
    return {
      providerIntentId: order.id,
      status: order.status === "paid" ? "captured" : "requires_action",
      clientPayload: {
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  async verifyWebhook(req: Request): Promise<VerifiedWebhookEvent> {
    const sig = req.headers.get("x-razorpay-signature");
    const body = await req.text();
    if (!sig) throw new Error("Missing x-razorpay-signature");

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(body)
      .digest("hex");

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("Invalid webhook signature");
    }

    const parsed = JSON.parse(body) as { event: string; payload?: unknown; created_at?: number; id?: string };
    return {
      providerEventId: parsed.id ?? crypto.createHash("sha256").update(body).digest("hex"),
      type: parsed.event,
      payload: parsed as unknown as Record<string, unknown>,
      receivedAt: new Date((parsed.created_at ?? Date.now() / 1000) * 1000),
    };
  }

  /**
   * Verify a checkout-handshake signature returned by Razorpay Checkout to
   * the browser. Used by the storefront's `/api/checkout/verify` route.
   */
  verifyCheckoutSignature(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    keySecret: string;
  }): boolean {
    const expected = crypto
      .createHmac("sha256", input.keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest("hex");
    const a = Buffer.from(input.razorpaySignature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

/**
 * Pure helper (no SDK) to verify a checkout signature when the gateway
 * instance isn't available — e.g. inside a Route Handler that only has the
 * `RAZORPAY_KEY_SECRET` env var.
 */
export function verifyRazorpayCheckoutSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", input.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(input.razorpaySignature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
