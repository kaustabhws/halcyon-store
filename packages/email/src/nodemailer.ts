import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, IEmailProvider } from "./index.ts";
import { renderTemplate } from "./templates.ts";

export interface NodemailerProviderOptions {
  /** SMTP host, e.g. "smtp.zoho.in" (India DC) or "smtp.zoho.com". */
  host: string;
  /** 465 for SSL, 587 for STARTTLS. */
  port: number;
  /** true for port 465 (implicit TLS), false for 587 (STARTTLS). */
  secure: boolean;
  /** Full mailbox login — must match (or be a verified alias of) the From. */
  user: string;
  /** Mailbox / app-specific password. */
  pass: string;
  /** "Halcyon <orders@yourdomain.com>" — From header. */
  from: string;
}

/**
 * SMTP email provider built on Nodemailer. Used for Zoho Mail (own-domain
 * mailbox) but works with any SMTP server. A single reusable transporter is
 * created per process — Nodemailer pools connections internally.
 */
export class NodemailerEmailProvider implements IEmailProvider {
  readonly code = "nodemailer";
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(opts: NodemailerProviderOptions) {
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      auth: { user: opts.user, pass: opts.pass },
    });
    this.from = opts.from;
  }

  async send(msg: EmailMessage): Promise<{ providerMessageId: string }> {
    const rendered = renderTemplate(msg.template, msg.data);
    const info = await this.transporter.sendMail({
      from: this.from,
      to: msg.to,
      subject: msg.subject ?? rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return { providerMessageId: info.messageId ?? `nodemailer-${Date.now()}` };
  }
}
