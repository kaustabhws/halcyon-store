import type { Money } from "@ecom/shared/money";

export type PaymentProviderCode =
  | "razorpay"
  | "stripe"
  | "paypal"
  | "cashfree"
  | "wallet"
  | "cod"
  | "gift_card"
  | "store_credit";

export type PaymentIntentStatus =
  | "requires_action"
  | "processing"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "partial_refund";

export interface CreateIntentInput {
  orderId: string;
  amount: Money;
  customerEmail?: string;
  notes?: Record<string, string>;
  idempotencyKey: string;
}

export interface IntentResult {
  providerIntentId: string;
  status: PaymentIntentStatus;
  clientPayload: Record<string, unknown>;
}

export interface CaptureInput {
  providerIntentId: string;
  amount?: Money;
  idempotencyKey: string;
}

export interface RefundInput {
  providerTxnId: string;
  amount: Money;
  reason?: string;
  idempotencyKey: string;
}

export interface TxnResult {
  providerTxnId: string;
  status: PaymentIntentStatus;
  raw: Record<string, unknown>;
}

export interface VerifiedWebhookEvent {
  providerEventId: string;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

export interface IPaymentGateway {
  readonly code: PaymentProviderCode;
  createIntent(input: CreateIntentInput): Promise<IntentResult>;
  capture(input: CaptureInput): Promise<TxnResult>;
  refund(input: RefundInput): Promise<TxnResult>;
  retrieve(providerIntentId: string): Promise<IntentResult>;
  verifyWebhook(req: Request): Promise<VerifiedWebhookEvent>;
}

export class PaymentGatewayRegistry {
  private readonly providers = new Map<PaymentProviderCode, IPaymentGateway>();

  register(gateway: IPaymentGateway): void {
    this.providers.set(gateway.code, gateway);
  }

  get(code: PaymentProviderCode): IPaymentGateway {
    const g = this.providers.get(code);
    if (!g) throw new Error(`Payment provider not registered: ${code}`);
    return g;
  }
}
