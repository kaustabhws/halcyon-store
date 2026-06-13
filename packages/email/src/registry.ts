import type { EmailMessage, IEmailProvider } from "./index.ts";
import { ConsoleEmailProvider } from "./index.ts";
import { NodemailerEmailProvider } from "./nodemailer.ts";
import { BRAND } from "@ecom/shared/brand";

let cached: IEmailProvider | null = null;

/**
 * Build a singleton email provider per process. Picks the Nodemailer (SMTP)
 * provider when SMTP_USER + SMTP_PASS are present, otherwise falls back to the
 * console provider so development still sees what would have been sent.
 *
 * SMTP_HOST/PORT default to Zoho's India DC on implicit TLS; override per env
 * for a different host or the .com DC.
 */
export function getEmailProvider(): IEmailProvider {
  if (cached) return cached;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? BRAND.defaultEmailFrom;

  if (user && pass) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
    cached = new NodemailerEmailProvider({
      host: process.env.SMTP_HOST ?? "smtp.zoho.in",
      port,
      secure,
      user,
      pass,
      from,
    });
  } else {
    cached = new ConsoleEmailProvider();
  }
  return cached;
}

/**
 * Fire-and-forget send. Never throws — email failures should not block the
 * domain action that triggered them.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const provider = getEmailProvider();
  try {
    await provider.send(msg);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] ${msg.template} → ${msg.to} failed:`,
      e instanceof Error ? e.message : e,
    );
  }
}
