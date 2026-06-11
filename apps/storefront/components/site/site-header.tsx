import Link from "next/link";
import { BRAND } from "@ecom/shared/brand";
import { auth } from "@/lib/auth";
import { getResolvedNav } from "@/lib/nav";
import { AccountChip } from "./account-chip";
import { SearchDialog } from "./search-dialog";
import { CartSheet } from "./cart-sheet";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";
import { ModeToggle } from "@/components/theme/mode-toggle";

export async function SiteHeader() {
  const [session, nav] = await Promise.all([auth(), getResolvedNav()]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <MobileNav items={nav.items} />
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background text-xs font-bold tracking-tight">
              {BRAND.initial}
            </span>
            <span className="font-display text-xl tracking-tight">
              {BRAND.name}
            </span>
          </Link>
        </div>

        <MainNav items={nav.items} />

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
