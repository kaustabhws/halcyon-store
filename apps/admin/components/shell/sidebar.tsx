"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  Warehouse,
  Settings,
  Sparkles,
  ChevronRight,
  Palette,
  MessageSquare,
  TicketPercent,
} from "lucide-react";
import { BRAND } from "@ecom/shared/brand";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    section: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/products/featured", label: "Featured", icon: Sparkles },
      { href: "/categories", label: "Categories", icon: Tag },
      { href: "/brands", label: "Brands", icon: Sparkles },
      { href: "/attributes", label: "Attributes", icon: Palette },
      { href: "/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    section: "Marketing",
    items: [{ href: "/coupons", label: "Coupons", icon: TicketPercent }],
  },
  {
    section: "People",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/reviews", label: "Reviews", icon: MessageSquare },
    ],
  },
  {
    section: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

/** Brand lockup shown at the top of the sidebar / mobile sheet. */
export function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2 px-5">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-[10px] font-bold text-background">
        {BRAND.initial}
      </span>
      <span className="text-sm font-semibold tracking-tight">
        {BRAND.name} Admin
      </span>
    </div>
  );
}

/**
 * The scrollable list of nav links. Shared by the desktop sidebar and the
 * mobile sheet. `onNavigate` lets the mobile sheet close itself on click.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-2">
      {NAV.map((sect) => (
        <div key={sect.section} className="mb-4">
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            {sect.section}
          </p>
          <ul className="space-y-0.5">
            {sect.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-900",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {active ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/40 lg:flex dark:border-zinc-900 dark:bg-zinc-950/40">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
