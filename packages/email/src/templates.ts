/**
 * Tiny email-template renderer. We keep templates inline rather than
 * pulling in react-email for now — it's the right call until the templates
 * grow past ~10 lines. When they do, swap the rendering layer here without
 * touching the providers.
 */
import type { EmailTemplate } from "./index.ts";
import { BRAND } from "@ecom/shared/brand";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export interface OrderConfirmData {
  orderNumber: string;
  customerName: string | null;
  itemCount: number;
  totalDisplay: string;
  itemsHtml: string;
  itemsText: string;
  orderUrl: string;
}

export interface OrderStatusData {
  orderNumber: string;
  customerName: string | null;
  status: string;
  message: string;
  orderUrl: string;
}

export interface RefundData {
  orderNumber: string;
  customerName: string | null;
  amountDisplay: string;
  orderUrl: string;
}

export interface PasswordResetData {
  customerName: string | null;
  resetUrl: string;
}

export interface AccountWelcomeData {
  customerName: string | null;
  loginUrl: string;
}

const FROM_BRAND = BRAND.name;

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:9999px;background:#0a0a0a;color:#fafafa;font-weight:700;">E</span>
        <span style="font-weight:600;">${FROM_BRAND}</span>
      </div>
    </div>
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;">
      ${bodyHtml}
    </div>
    <p style="color:#71717a;font-size:12px;margin-top:24px;text-align:center;">
      You're receiving this because of activity on your ${FROM_BRAND} account.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): RenderedEmail {
  switch (template) {
    case "order.confirmed": {
      const d = data as unknown as OrderConfirmData;
      const subject = `Your ${FROM_BRAND} order ${d.orderNumber} is confirmed`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:24px;letter-spacing:-0.01em;">Thanks${
          d.customerName ? `, ${escapeHtml(d.customerName)}` : ""
        }.</h1>
        <p style="color:#52525b;margin:0 0 24px 0;">
          Your order <strong>${escapeHtml(d.orderNumber)}</strong> is confirmed.
          We'll let you know when it ships.
        </p>
        <div style="border-top:1px solid #e4e4e7;padding-top:16px;">${d.itemsHtml}</div>
        <p style="font-size:18px;font-weight:600;margin:20px 0 0 0;">
          Total: ${escapeHtml(d.totalDisplay)}
        </p>
        <p style="margin:24px 0 0 0;">
          <a href="${escapeHtml(d.orderUrl)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:12px 20px;border-radius:9999px;text-decoration:none;">View order</a>
        </p>`;
      const text = `Your order ${d.orderNumber} is confirmed.\n\n${d.itemsText}\nTotal: ${d.totalDisplay}\n\nView order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }
    case "order.shipped":
    case "order.delivered":
    case "order.cancelled": {
      const d = data as unknown as OrderStatusData;
      const subject = `${FROM_BRAND}: order ${d.orderNumber} ${d.status.toLowerCase()}`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:24px;letter-spacing:-0.01em;">Order update</h1>
        <p style="color:#52525b;margin:0 0 16px 0;">
          ${escapeHtml(d.message)}
        </p>
        <p style="margin:24px 0 0 0;">
          <a href="${escapeHtml(d.orderUrl)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:12px 20px;border-radius:9999px;text-decoration:none;">View order</a>
        </p>`;
      const text = `${d.message}\n\nView order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }
    case "refund.processed": {
      const d = data as unknown as RefundData;
      const subject = `Refund issued for order ${d.orderNumber}`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:24px;letter-spacing:-0.01em;">Your refund is on the way.</h1>
        <p style="color:#52525b;margin:0 0 16px 0;">
          We've refunded <strong>${escapeHtml(d.amountDisplay)}</strong> to your original payment method
          for order <strong>${escapeHtml(d.orderNumber)}</strong>. It usually takes 5–7 business days to land.
        </p>
        <p style="margin:24px 0 0 0;">
          <a href="${escapeHtml(d.orderUrl)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:12px 20px;border-radius:9999px;text-decoration:none;">View order</a>
        </p>`;
      const text = `We've refunded ${d.amountDisplay} for order ${d.orderNumber}. View order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }
    case "password.reset": {
      const d = data as unknown as PasswordResetData;
      const subject = `Reset your ${FROM_BRAND} password`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:24px;letter-spacing:-0.01em;">Password reset</h1>
        <p style="color:#52525b;margin:0 0 16px 0;">
          We received a request to reset your password. The link expires in 30 minutes.
        </p>
        <p style="margin:24px 0 0 0;">
          <a href="${escapeHtml(d.resetUrl)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:12px 20px;border-radius:9999px;text-decoration:none;">Reset password</a>
        </p>
        <p style="color:#71717a;font-size:12px;margin-top:16px;">If you didn't ask for this, ignore this email.</p>`;
      const text = `Reset your password: ${d.resetUrl}\n\nThe link expires in 30 minutes.`;
      return { subject, html: shell(subject, body), text };
    }
    case "account.welcome": {
      const d = data as unknown as AccountWelcomeData;
      const subject = `Welcome to ${FROM_BRAND}`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:24px;letter-spacing:-0.01em;">Welcome${
          d.customerName ? `, ${escapeHtml(d.customerName)}` : ""
        }.</h1>
        <p style="color:#52525b;margin:0 0 16px 0;">
          Glad you're here. Your account is set up and ready.
        </p>
        <p style="margin:24px 0 0 0;">
          <a href="${escapeHtml(d.loginUrl)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;padding:12px 20px;border-radius:9999px;text-decoration:none;">Browse the shelf</a>
        </p>`;
      const text = `Welcome to ${FROM_BRAND}. ${d.loginUrl}`;
      return { subject, html: shell(subject, body), text };
    }
  }
}
