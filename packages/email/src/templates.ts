/**
 * Transactional email templates. Rendered as inline-styled, table-based HTML
 * for maximum email-client compatibility (Gmail, Outlook, Apple Mail) — no
 * flexbox, no external CSS. The provider layer calls renderTemplate() and
 * ships the result; swapping providers never touches this file.
 */
import type { EmailTemplate } from "./index.ts";
import { BRAND } from "@ecom/shared/brand";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export interface EmailLineItem {
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  quantity: number;
  lineTotalDisplay: string;
}

export interface EmailAddress {
  fullName: string;
  lines: string[];
  phone?: string | null;
}

export interface OrderSummary {
  subtotalDisplay: string;
  discountDisplay?: string | null;
  shippingDisplay: string;
  totalDisplay: string;
}

export interface OrderConfirmData {
  orderNumber: string;
  customerName: string | null;
  placedAtDisplay: string;
  items: EmailLineItem[];
  summary: OrderSummary;
  shippingAddress?: EmailAddress | null;
  orderUrl: string;
}

export interface OrderStatusData {
  orderNumber: string;
  customerName: string | null;
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
  shopUrl: string;
  categoriesUrl: string;
  accountUrl: string;
}

const FROM_BRAND = BRAND.name;
const INK = "#0a0a0a";
const PAPER = "#ffffff";
const CANVAS = "#f5f5f4";
const BORDER = "#e7e5e4";
const HAIRLINE = "#f0efed";
const MUTED = "#78716c";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Primary pill button. */
function button(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${INK};color:#fafafa;padding:13px 24px;border-radius:9999px;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

/** A small status badge chip. */
function badge(label: string, color: string, bg: string): string {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:5px 12px;border-radius:9999px;">${escapeHtml(label)}</span>`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
        <!-- header -->
        <tr><td style="padding:0 4px 20px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:9999px;background:${INK};color:#fafafa;font-weight:700;font-size:16px;">${escapeHtml(BRAND.initial)}</span>
            </td>
            <td style="vertical-align:middle;padding-left:10px;font-weight:600;font-size:17px;letter-spacing:-0.01em;">${escapeHtml(FROM_BRAND)}</td>
          </tr></table>
        </td></tr>
        <!-- card -->
        <tr><td style="background:${PAPER};border:1px solid ${BORDER};border-radius:18px;padding:36px;">
          ${bodyHtml}
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:24px 8px 8px 8px;text-align:center;color:${MUTED};font-size:12px;line-height:1.6;">
          <p style="margin:0 0 4px 0;">${escapeHtml(FROM_BRAND)} · ${escapeHtml(BRAND.location)}</p>
          <p style="margin:0;">Questions? <a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:${MUTED};">${escapeHtml(BRAND.supportEmail)}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function greeting(name: string | null): string {
  return name ? `, ${escapeHtml(name)}` : "";
}

function itemsTable(items: EmailLineItem[]): string {
  const rows = items
    .map((it) => {
      const img = it.imageUrl
        ? `<img src="${escapeHtml(it.imageUrl)}" alt="" width="56" height="56" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid ${BORDER};display:block;"/>`
        : `<div style="width:56px;height:56px;border-radius:10px;background:${CANVAS};border:1px solid ${BORDER};"></div>`;
      const variant = it.variantName
        ? `<div style="color:${MUTED};font-size:13px;margin-top:2px;">${escapeHtml(it.variantName)}</div>`
        : "";
      return `<tr>
        <td style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};width:56px;vertical-align:top;">${img}</td>
        <td style="padding:14px 14px;border-bottom:1px solid ${HAIRLINE};vertical-align:top;">
          <div style="font-weight:600;font-size:14px;line-height:1.35;">${escapeHtml(it.name)}</div>
          ${variant}
          <div style="color:${MUTED};font-size:13px;margin-top:2px;">Qty ${it.quantity}</div>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};vertical-align:top;font-weight:600;font-size:14px;white-space:nowrap;">${escapeHtml(it.lineTotalDisplay)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function summaryTable(s: OrderSummary): string {
  const line = (label: string, value: string, opts?: { bold?: boolean; muted?: boolean }) =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;${opts?.bold ? "font-weight:700;" : ""}color:${opts?.muted ? MUTED : INK};">${escapeHtml(label)}</td>
      <td align="right" style="padding:6px 0;font-size:14px;${opts?.bold ? "font-weight:700;" : ""}color:${opts?.muted ? MUTED : INK};white-space:nowrap;">${escapeHtml(value)}</td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    ${line("Subtotal", s.subtotalDisplay, { muted: true })}
    ${s.discountDisplay ? line("Discount", `−${s.discountDisplay}`, { muted: true }) : ""}
    ${line("Shipping", s.shippingDisplay, { muted: true })}
    <tr><td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:1px solid ${BORDER};"></div></td></tr>
    ${line("Total", s.totalDisplay, { bold: true })}
  </table>`;
}

function addressBlock(addr: EmailAddress): string {
  const lines = [addr.fullName, ...addr.lines, addr.phone ? `Phone: ${addr.phone}` : ""]
    .filter(Boolean)
    .map((l) => escapeHtml(l as string))
    .join("<br/>");
  return `<div style="margin-top:24px;">
    <div style="font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};margin-bottom:6px;">Shipping to</div>
    <div style="font-size:14px;line-height:1.6;color:#3f3f46;">${lines}</div>
  </div>`;
}

const STATUS_VISUALS: Record<
  "order.processing" | "order.shipped" | "order.delivered" | "order.cancelled",
  { badgeLabel: string; color: string; bg: string; headline: string; subject: (n: string) => string }
> = {
  "order.processing": {
    badgeLabel: "Processing",
    color: "#1d4ed8",
    bg: "#eff6ff",
    headline: "We're preparing your order",
    subject: (n) => `${FROM_BRAND}: order ${n} is being prepared`,
  },
  "order.shipped": {
    badgeLabel: "Shipped",
    color: "#4338ca",
    bg: "#eef2ff",
    headline: "Your order is on its way",
    subject: (n) => `${FROM_BRAND}: order ${n} has shipped`,
  },
  "order.delivered": {
    badgeLabel: "Delivered",
    color: "#15803d",
    bg: "#f0fdf4",
    headline: "Your order has arrived",
    subject: (n) => `${FROM_BRAND}: order ${n} was delivered`,
  },
  "order.cancelled": {
    badgeLabel: "Cancelled",
    color: "#b91c1c",
    bg: "#fef2f2",
    headline: "Your order was cancelled",
    subject: (n) => `${FROM_BRAND}: order ${n} was cancelled`,
  },
};

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): RenderedEmail {
  switch (template) {
    case "order.confirmed": {
      const d = data as unknown as OrderConfirmData;
      const subject = `Your ${FROM_BRAND} order ${d.orderNumber} is confirmed`;
      const body = `
        ${badge("Order confirmed", "#15803d", "#f0fdf4")}
        <h1 style="margin:16px 0 8px 0;font-size:26px;letter-spacing:-0.02em;">Thank you${greeting(d.customerName)}.</h1>
        <p style="color:${MUTED};margin:0 0 4px 0;font-size:15px;line-height:1.6;">
          We've got your order and we're on it. Here's a recap.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px 0;">
          <tr>
            <td style="font-size:13px;color:${MUTED};">Order <strong style="color:${INK};">${escapeHtml(d.orderNumber)}</strong></td>
            <td align="right" style="font-size:13px;color:${MUTED};">${escapeHtml(d.placedAtDisplay)}</td>
          </tr>
        </table>
        <div style="border-top:1px solid ${BORDER};margin-top:8px;padding-top:4px;">${itemsTable(d.items)}</div>
        ${summaryTable(d.summary)}
        ${d.shippingAddress ? addressBlock(d.shippingAddress) : ""}
        <div style="margin-top:28px;">${button("View your order", d.orderUrl)}</div>`;
      const textItems = d.items
        .map(
          (it) =>
            `  ${it.name}${it.variantName ? ` (${it.variantName})` : ""} × ${it.quantity} — ${it.lineTotalDisplay}`,
        )
        .join("\n");
      const text = `Thank you for your order.\n\nOrder ${d.orderNumber} · ${d.placedAtDisplay}\n\n${textItems}\n\nSubtotal: ${d.summary.subtotalDisplay}${
        d.summary.discountDisplay ? `\nDiscount: -${d.summary.discountDisplay}` : ""
      }\nShipping: ${d.summary.shippingDisplay}\nTotal: ${d.summary.totalDisplay}\n\nView your order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }

    case "order.processing":
    case "order.shipped":
    case "order.delivered":
    case "order.cancelled": {
      const d = data as unknown as OrderStatusData;
      const v = STATUS_VISUALS[template];
      const subject = v.subject(d.orderNumber);
      const body = `
        ${badge(v.badgeLabel, v.color, v.bg)}
        <h1 style="margin:16px 0 8px 0;font-size:26px;letter-spacing:-0.02em;">${escapeHtml(v.headline)}${greeting(d.customerName)}.</h1>
        <p style="color:${MUTED};margin:0 0 4px 0;font-size:15px;line-height:1.6;">${escapeHtml(d.message)}</p>
        <p style="color:${MUTED};margin:14px 0 0 0;font-size:13px;">Order <strong style="color:${INK};">${escapeHtml(d.orderNumber)}</strong></p>
        <div style="margin-top:26px;">${button("View your order", d.orderUrl)}</div>`;
      const text = `${v.headline}.\n\n${d.message}\n\nOrder ${d.orderNumber}\nView your order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }

    case "refund.processed": {
      const d = data as unknown as RefundData;
      const subject = `Refund issued for order ${d.orderNumber}`;
      const body = `
        ${badge("Refund issued", "#15803d", "#f0fdf4")}
        <h1 style="margin:16px 0 8px 0;font-size:26px;letter-spacing:-0.02em;">Your refund is on the way${greeting(d.customerName)}.</h1>
        <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.6;">
          We've refunded <strong style="color:${INK};">${escapeHtml(d.amountDisplay)}</strong> to your original payment
          method for order <strong style="color:${INK};">${escapeHtml(d.orderNumber)}</strong>.
          It usually takes 5–7 business days to land.
        </p>
        <div style="margin-top:26px;">${button("View your order", d.orderUrl)}</div>`;
      const text = `We've refunded ${d.amountDisplay} for order ${d.orderNumber}. It takes 5–7 business days to land.\n\nView your order: ${d.orderUrl}`;
      return { subject, html: shell(subject, body), text };
    }

    case "password.reset": {
      const d = data as unknown as PasswordResetData;
      const subject = `Reset your ${FROM_BRAND} password`;
      const body = `
        <h1 style="margin:0 0 8px 0;font-size:26px;letter-spacing:-0.02em;">Password reset</h1>
        <p style="color:${MUTED};margin:0;font-size:15px;line-height:1.6;">
          We received a request to reset your password. This link expires in 30 minutes.
        </p>
        <div style="margin-top:26px;">${button("Reset password", d.resetUrl)}</div>
        <p style="color:${MUTED};font-size:12px;margin-top:18px;">If you didn't ask for this, you can safely ignore this email.</p>`;
      const text = `Reset your password: ${d.resetUrl}\n\nThe link expires in 30 minutes.`;
      return { subject, html: shell(subject, body), text };
    }

    case "account.welcome": {
      const d = data as unknown as AccountWelcomeData;
      const subject = `Welcome to ${FROM_BRAND}`;
      const body = `
        <h1 style="margin:0 0 10px 0;font-size:28px;letter-spacing:-0.02em;">Welcome to ${escapeHtml(FROM_BRAND)}${greeting(d.customerName)}.</h1>
        <p style="color:${MUTED};margin:0 0 6px 0;font-size:15px;line-height:1.7;">
          ${escapeHtml(BRAND.tagline)} Your account is set up and ready — here's where to start.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;">
          <tr>
            <td style="padding:14px 16px;border:1px solid ${BORDER};border-radius:12px;">
              <div style="font-weight:600;font-size:15px;">Shop the latest</div>
              <div style="color:${MUTED};font-size:13px;margin-top:2px;">Fresh drops across every category.</div>
              <div style="margin-top:8px;"><a href="${escapeHtml(d.shopUrl)}" style="color:${INK};font-size:14px;font-weight:600;text-decoration:none;">Browse the shop →</a></div>
            </td>
          </tr>
          <tr><td style="height:10px;"></td></tr>
          <tr>
            <td style="padding:14px 16px;border:1px solid ${BORDER};border-radius:12px;">
              <div style="font-weight:600;font-size:15px;">Find your edit</div>
              <div style="color:${MUTED};font-size:13px;margin-top:2px;">Explore curated collections by category.</div>
              <div style="margin-top:8px;"><a href="${escapeHtml(d.categoriesUrl)}" style="color:${INK};font-size:14px;font-weight:600;text-decoration:none;">View collections →</a></div>
            </td>
          </tr>
        </table>
        <div style="margin-top:24px;">${button("Start shopping", d.shopUrl)}</div>
        <p style="color:${MUTED};font-size:12px;margin-top:18px;">Manage your details anytime from your <a href="${escapeHtml(d.accountUrl)}" style="color:${MUTED};">account</a>.</p>`;
      const text = `Welcome to ${FROM_BRAND}${d.customerName ? `, ${d.customerName}` : ""}.\n\n${BRAND.tagline}\n\nShop: ${d.shopUrl}\nCollections: ${d.categoriesUrl}\nYour account: ${d.accountUrl}`;
      return { subject, html: shell(subject, body), text };
    }
  }
}
