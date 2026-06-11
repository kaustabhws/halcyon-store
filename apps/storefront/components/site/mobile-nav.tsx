"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BRAND } from "@ecom/shared/brand";
import type { ResolvedNavItem } from "@ecom/shared/nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function MobileNav({ items }: { items: ResolvedNavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Auto-close on route change so subsequent navigation doesn't surprise.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkCls = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2.5 text-sm transition-colors",
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          className="md:hidden"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-left">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {BRAND.initial}
            </span>
            <span className="font-display text-xl tracking-tight">{BRAND.name}</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 p-2">
          <Link href="/shop" className={linkCls(pathname === "/shop")}>
            Shop
          </Link>

          {items.map((item, i) =>
            item.children.length > 0 ? (
              <div key={i} className="py-1">
                <Link href={item.href} className={cn(linkCls(pathname === item.href), "font-medium")}>
                  {item.label}
                </Link>
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href} className={linkCls(pathname === c.href)}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={i} href={item.href} className={linkCls(pathname === item.href)}>
                {item.label}
              </Link>
            ),
          )}

          <div className="my-1 h-px bg-border" />
          <Link href="/search" className={linkCls(pathname === "/search")}>
            Search
          </Link>
          <Link href="/account" className={linkCls(pathname.startsWith("/account"))}>
            Account
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
