/**
 * Single source of truth for the storefront and admin brand. Keeping these
 * in one place means renaming the platform is a single-file change rather
 * than a hunt across both apps + the email package.
 */
export const BRAND = {
  /** Full name. Used in headers, footers, page titles, email subjects. */
  name: "Halcyon",
  /** Single character for the logo chip. */
  initial: "H",
  /** Short marketing line — used in hero section and email shell. */
  tagline: "Designed for clarity. Built for craft.",
  /** Description used in metadata + meta tags. */
  description:
    "A premium ecommerce experience for sneakers, watches, and headphones.",
  /** Customer-facing support address shown in the footer. */
  supportEmail: "hello@halcyon.example",
  /** Default From address for transactional email. Override with EMAIL_FROM env. */
  defaultEmailFrom: "Halcyon <orders@halcyon.example>",
  /** City + region tagline for the footer. */
  location: "Bengaluru, KA · India",
} as const;

export type Brand = typeof BRAND;
