"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-1 text-sm">
      {TABS.map((t) => {
        const active =
          t.href === "/account"
            ? pathname === "/account"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active || undefined}
            className={cn(
              "rounded-full px-4 py-2 transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
