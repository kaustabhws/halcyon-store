import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { BRAND } from "@ecom/shared/brand";
import type { HeroDesign, HeroText } from "@ecom/shared/hero";

export type HeroProduct = {
  name: string;
  slug: string;
  brandName: string | null;
  imageUrl: string | null;
  priceLabel: string | null;
};

export type HeroQuickLink = { id: string; name: string; slug: string };

type HeroProps = {
  design: HeroDesign;
  text: HeroText;
  product: HeroProduct | null;
  quickLinks: HeroQuickLink[];
};

function QuickLinks({ links }: { links: HeroQuickLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-sm">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        Shop
      </span>
      {links.map((c) => (
        <Link
          key={c.id}
          href={`/shop/${c.slug}`}
          className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}

/** Picks the right home hero layout based on the admin-chosen design. */
export function HomeHero(props: HeroProps) {
  switch (props.design) {
    case "fullbleed":
      return <FullBleedHero {...props} />;
    case "text":
      return <TextHero {...props} />;
    case "minimal":
      return <MinimalHero {...props} />;
    case "split":
    default:
      return <SplitHero {...props} />;
  }
}

/* ------------------------------------------------------------------ */
/* Split editorial — copy on one side, hero product image on the other */
/* ------------------------------------------------------------------ */
function SplitHero({ text, product, quickLinks }: HeroProps) {
  const eyebrow = product?.brandName ?? text.eyebrow;
  return (
    <section className="border-b bg-background">
      <div className="container-page grid items-stretch gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-16 lg:gap-16">
        <div className="flex flex-col justify-center md:py-8">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {product ? (
                product.name
              ) : (
                <>
                  {text.headlineLead}{" "}
                  <span className="italic text-muted-foreground">
                    {text.headlineEmphasis}
                  </span>
                </>
              )}
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            {product ? (
              product.priceLabel ? (
                <p className="mt-5 text-2xl font-semibold tabular-nums">
                  {product.priceLabel}
                </p>
              ) : null
            ) : (
              <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
                {text.subtext}
              </p>
            )}
          </Reveal>
          <Reveal delay={0.2}>
            <HeroCtas text={text} product={product} />
          </Reveal>
          <Reveal delay={0.26}>
            <QuickLinks links={quickLinks} />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <HeroImage
            src={product?.imageUrl ?? null}
            alt={product?.name ?? BRAND.name}
            className="aspect-4/5 md:aspect-auto md:h-full md:min-h-[28rem]"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Full-bleed — edge-to-edge image with overlaid copy                  */
/* ------------------------------------------------------------------ */
function FullBleedHero({ text, product }: HeroProps) {
  const eyebrow = product?.brandName ?? text.eyebrow;
  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden border-b md:min-h-[80vh]">
      {product?.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-950" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-black/10" />
      <div className="container-page relative z-10 flex min-h-[70vh] flex-col justify-end py-16 text-white md:min-h-[80vh] md:py-24">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            {eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            {product ? (
              product.name
            ) : (
              <>
                {text.headlineLead}{" "}
                <span className="italic text-white/70">
                  {text.headlineEmphasis}
                </span>
              </>
            )}
          </h1>
        </Reveal>
        {product?.priceLabel ? (
          <Reveal delay={0.14}>
            <p className="mt-4 text-2xl font-semibold tabular-nums">
              {product.priceLabel}
            </p>
          </Reveal>
        ) : !product ? (
          <Reveal delay={0.14}>
            <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">
              {text.subtext}
            </p>
          </Reveal>
        ) : null}
        <Reveal delay={0.2}>
          <HeroCtas text={text} product={product} onDark />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Text only — editorial typography, no product imagery                */
/* ------------------------------------------------------------------ */
function TextHero({ text, quickLinks }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      <div className="container-page relative z-10 py-20 md:py-28 lg:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {text.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              {text.headlineLead}{" "}
              <span className="italic text-muted-foreground">
                {text.headlineEmphasis}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              {text.subtext}
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <HeroCtas text={text} product={null} />
          </Reveal>
          <Reveal delay={0.28}>
            <QuickLinks links={quickLinks} />
          </Reveal>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,0,0,0.04),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_60%)]" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Minimal centered — tight, centered typography                       */
/* ------------------------------------------------------------------ */
function MinimalHero({ text }: HeroProps) {
  return (
    <section className="border-b bg-background">
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {text.eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            {text.headlineLead}{" "}
            <span className="italic text-muted-foreground">
              {text.headlineEmphasis}
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg">
            {text.subtext}
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <div className="flex justify-center">
            <HeroCtas text={text} product={null} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------- shared ------------------------------- */
function HeroCtas({
  text,
  product,
  onDark = false,
}: {
  text: HeroText;
  product: HeroProduct | null;
  onDark?: boolean;
}) {
  const primary = product
    ? { label: "Shop now", href: `/product/${product.slug}` }
    : { label: text.primaryLabel, href: text.primaryHref };
  const secondary = product
    ? { label: "Browse all", href: "/shop" }
    : { label: text.secondaryLabel, href: text.secondaryHref };

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild size="lg" variant={onDark ? "secondary" : "default"}>
        <Link href={primary.href || "/shop"}>{primary.label || "Shop"}</Link>
      </Button>
      {secondary.label ? (
        <Button
          asChild
          size="lg"
          variant="outline"
          className={onDark ? "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}
        >
          <Link href={secondary.href || "/shop"}>{secondary.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function HeroImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl bg-muted ${className ?? ""}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-background">
          <span className="font-display text-3xl italic text-muted-foreground">
            {BRAND.name}
          </span>
        </div>
      )}
    </div>
  );
}
