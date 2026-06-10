export type EmailTemplate =
  | "order.confirmed"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "refund.processed"
  | "password.reset"
  | "account.welcome";

export interface EmailMessage {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  subject?: string;
}

export interface IEmailProvider {
  readonly code: string;
  send(msg: EmailMessage): Promise<{ providerMessageId: string }>;
}

/** Default MVP provider — logs to console; real provider plugs in later. */
export class ConsoleEmailProvider implements IEmailProvider {
  readonly code = "console";
  async send(msg: EmailMessage) {
    // eslint-disable-next-line no-console
    console.log("[email:console]", msg.template, "→", msg.to, msg.data);
    return { providerMessageId: `console-${Date.now()}` };
  }
}
