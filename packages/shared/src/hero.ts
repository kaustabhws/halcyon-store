/**
 * Homepage hero configuration — shared between the admin (which edits it) and
 * the storefront (which renders it). Stored in the Setting table under three
 * keys: `homepage.heroDesign`, `homepage.heroProductId`, `homepage.heroText`.
 *
 * Kept as pure types + helpers (no Prisma) so both apps can import it.
 */

export const HERO_DESIGNS = ["split", "fullbleed", "text", "minimal"] as const;
export type HeroDesign = (typeof HERO_DESIGNS)[number];

export const HERO_DESIGN_LABELS: Record<HeroDesign, string> = {
  split: "Split editorial",
  fullbleed: "Full-bleed image",
  text: "Text only",
  minimal: "Minimal centered",
};

/** Designs that render the selected hero product's image. */
export const HERO_DESIGNS_USING_PRODUCT: readonly HeroDesign[] = [
  "split",
  "fullbleed",
];

export type HeroText = {
  eyebrow: string;
  headlineLead: string;
  headlineEmphasis: string;
  subtext: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type HeroConfig = {
  design: HeroDesign;
  productId: string | null;
  text: HeroText;
};

export const DEFAULT_HERO_DESIGN: HeroDesign = "split";

export const DEFAULT_HERO_TEXT: HeroText = {
  eyebrow: "New season",
  headlineLead: "The shelf,",
  headlineEmphasis: "curated.",
  subtext:
    "Sneakers, watches, headphones — three categories, no compromises. Each product earns its place.",
  primaryLabel: "Shop the shelf",
  primaryHref: "/shop",
  secondaryLabel: "New arrivals",
  secondaryHref: "/shop/sneakers",
};

function stripQuotes(s: string): string {
  return s.replace(/^"+|"+$/g, "");
}

export function normalizeHeroDesign(raw: unknown): HeroDesign {
  const s = typeof raw === "string" ? stripQuotes(raw) : "";
  return (HERO_DESIGNS as readonly string[]).includes(s)
    ? (s as HeroDesign)
    : DEFAULT_HERO_DESIGN;
}

/** Merge a stored (possibly partial / untrusted) text blob over the defaults. */
export function normalizeHeroText(raw: unknown): HeroText {
  const out: HeroText = { ...DEFAULT_HERO_TEXT };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_HERO_TEXT) as (keyof HeroText)[]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim().length > 0) out[key] = v;
    }
  }
  return out;
}

export function normalizeHeroProductId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = stripQuotes(raw).trim();
  return id.length > 0 ? id : null;
}

/** Build a fully-resolved HeroConfig from the three raw Setting values. */
export function parseHeroConfig(raw: {
  design: unknown;
  productId: unknown;
  text: unknown;
}): HeroConfig {
  return {
    design: normalizeHeroDesign(raw.design),
    productId: normalizeHeroProductId(raw.productId),
    text: normalizeHeroText(raw.text),
  };
}

export const HERO_SETTING_KEYS = {
  design: "homepage.heroDesign",
  productId: "homepage.heroProductId",
  text: "homepage.heroText",
} as const;
