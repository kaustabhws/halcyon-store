export type AnalyticsEventName =
  | "page.view"
  | "product.view"
  | "search.run"
  | "search.click"
  | "cart.add"
  | "cart.remove"
  | "checkout.step"
  | "checkout.complete"
  | "order.placed"
  | "order.cancelled"
  | "review.submitted";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: Date;
  sessionId: string;
  customerId?: string;
  anonymousToken?: string;
  payload: Record<string, unknown>;
}

export interface IAnalyticsSink {
  capture(events: AnalyticsEvent[]): Promise<void>;
}
