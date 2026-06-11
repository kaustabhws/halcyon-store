"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/cn";
import type { ResolvedNavItem } from "@ecom/shared/nav";

const linkCls =
  "inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** Desktop primary nav. A fixed "Shop" link always comes first; configured
 *  items follow, rendering as dropdowns when they have children. */
export function MainNav({ items }: { items: ResolvedNavItem[] }) {
  return (
    <NavigationMenu className="hidden md:flex" viewport={false}>
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(linkCls)}>
            <Link href="/shop">Shop</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {items.map((item, i) =>
          item.children.length > 0 ? (
            <NavigationMenuItem key={i}>
              <NavigationMenuTrigger className="text-muted-foreground data-[state=open]:text-foreground">
                {item.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-56 gap-0.5 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link href={item.href} className="font-medium">
                        Shop all {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <NavigationMenuLink asChild>
                        <Link href={c.href} className="text-muted-foreground">
                          {c.label}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={i}>
              <NavigationMenuLink asChild className={cn(linkCls)}>
                <Link href={item.href}>{item.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
