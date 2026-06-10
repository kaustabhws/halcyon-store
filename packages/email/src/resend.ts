import { Resend } from "resend";
import type { EmailMessage, IEmailProvider } from "./index.ts";
import { renderTemplate } from "./templates.ts";

export interface ResendEmailProviderOptions {
  apiKey: string;
  /** "Ecom <orders@ecom.example>" — Resend-verified sender. */
  from: string;
}

export class ResendEmailProvider implements IEmailProvider {
  readonly code = "resend";
  private readonly client: Resend;
  private readonly from: string;

  constructor(opts: ResendEmailProviderOptions) {
    this.client = new Resend(opts.apiKey);
    this.from = opts.from;
  }

  async send(msg: EmailMessage): Promise<{ providerMessageId: string }> {
    const rendered = renderTemplate(msg.template, msg.data);
    const res = await this.client.emails.send({
      from: this.from,
      to: msg.to,
      subject: msg.subject ?? rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (res.error) {
      throw new Error(`Resend: ${res.error.message ?? "send failed"}`);
    }
    return { providerMessageId: res.data?.id ?? `resend-${Date.now()}` };
  }
}
