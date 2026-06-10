import type { EmailMessage, IEmailProvider } from "./index.ts";
import { ConsoleEmailProvider } from "./index.ts";
import { ResendEmailProvider } from "./resend.ts";

let cached: IEmailProvider | null = null;

/**
 * Build a singleton email provider per process. Picks Resend when
 * RESEND_API_KEY + EMAIL_FROM env vars are present, otherwise falls back
 * to the console provider so development still sees what would have been
 * sent.
 */
export function getEmailProvider(): IEmailProvider {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) {
    cached = new ResendEmailProvider({ apiKey, from });
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
