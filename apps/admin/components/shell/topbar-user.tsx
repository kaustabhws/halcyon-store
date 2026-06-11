"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, ExternalLink } from "lucide-react";

export function TopbarUser({
  user,
  isMock,
  storefrontUrl,
}: {
  user: { fullName: string | null; email: string };
  isMock: boolean;
  storefrontUrl: string;
}) {
  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
          aria-label="Account menu"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">
            {initials}
          </span>
          <span className="hidden text-xs sm:block">
            {user.fullName ?? user.email}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-lg border border-zinc-200 bg-background p-1.5 shadow-lg dark:border-zinc-800"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user.fullName ?? "Admin"}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <DropdownMenu.Item asChild>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-zinc-900"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open storefront</span>
            </a>
          </DropdownMenu.Item>
          {isMock ? (
            <div className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Mock auth on. Add Clerk keys + set <code>MOCK_ADMIN=false</code> for real auth.
            </div>
          ) : (
            <DropdownMenu.Item asChild>
              <a
                href="/sign-out"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 outline-none data-[highlighted]:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </a>
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
