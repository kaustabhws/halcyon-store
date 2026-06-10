import Link from "next/link";
import { BRAND } from "@ecom/shared/brand";
import { auth } from "@/lib/auth";
import { AccountChip } from "./account-chip";
import { SearchDialog } from "./search-dialog";
import { CartSheet } from "./cart-sheet";
import { MobileNav } from "./mobile-nav";
import { ModeToggle } from "@/components/theme/mode-toggle";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/sneakers", label: "Sneakers" },
  { href: "/shop/watches", label: "Watches" },
  { href: "/shop/headphones", label: "Headphones" },
];

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background text-xs font-bold tracking-tight">
              {BRAND.initial}
            </span>
            <span className="font-display text-xl tracking-tight">
              {BRAND.name}
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <SearchDialog />
          <ModeToggle />
          <AccountChip
            session={
              session
                ? { name: session.user.name ?? null, email: session.user.email }
                : null
            }
          />
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
