import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { BRAND } from "@ecom/shared/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FOOTER_GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/shop/sneakers", label: "Sneakers" },
      { href: "/shop/watches", label: "Watches" },
      { href: "/shop/headphones", label: "Headphones" },
      { href: "/shop", label: "All products" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account", label: "Overview" },
      { href: "/account/orders", label: "Orders" },
      { href: "/account/addresses", label: "Addresses" },
      { href: "/account/profile", label: "Profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t bg-muted/20">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1.5fr]">
        <div className="space-y-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background text-xs font-bold">
              {BRAND.initial}
            </span>
            <span className="font-display text-2xl tracking-tight">
              {BRAND.name}
            </span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            {BRAND.tagline} Shipped from Bengaluru.
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {BRAND.location}
            </p>
            <p className="inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              {BRAND.supportEmail}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-1">
          {FOOTER_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {g.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Stay in the loop
          </h3>
          <p className="text-sm text-muted-foreground">
            New drops, restocks, and the occasional thought we couldn&rsquo;t fit
            on the product page.
          </p>
          <form action="/api/newsletter" method="post" className="flex max-w-sm gap-2">
            <Input
              type="email"
              name="email"
              required
              placeholder="you@domain.com"
              aria-label="Email address"
              className="flex-1"
            />
            <Button type="submit">Subscribe</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            By subscribing you agree to our privacy policy.
          </p>
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded border px-2 py-1">Razorpay</span>
            <span className="rounded border px-2 py-1">UPI</span>
            <span className="rounded border px-2 py-1">Cards</span>
            <span className="rounded border px-2 py-1">Net banking</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
