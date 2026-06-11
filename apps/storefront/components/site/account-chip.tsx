"use client";

import * as React from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, LogOut, Package, MapPin, ChevronRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";

export function AccountChip({
  session,
}: {
  session: { name: string | null; email: string } | null;
}) {
  const [pending, startTransition] = React.useTransition();

  if (!session) {
    return (
      <Button asChild variant="ghost" size="icon" aria-label="Sign in">
        <Link href="/login">
          <User />
        </Link>
      </Button>
    );
  }

  const initials = (session.name ?? session.email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background transition-opacity hover:opacity-80"
        >
          {initials}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-xl border bg-popover p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{session.name ?? "Account"}</p>
            <p className="text-xs text-muted-foreground">{session.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <Item href="/account" icon={<User className="h-4 w-4" />}>Overview</Item>
          <Item href="/account/orders" icon={<Package className="h-4 w-4" />}>Orders</Item>
          <Item href="/account/addresses" icon={<MapPin className="h-4 w-4" />}>Addresses</Item>
          <Item href="/account/profile" icon={<UserCircle className="h-4 w-4" />}>Profile</Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await logoutAction();
              });
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 outline-none data-[highlighted]:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{pending ? "Signing out…" : "Sign out"}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
      >
        {icon}
        <span className="flex-1">{children}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </DropdownMenu.Item>
  );
}
