"use client";

import { useClerk } from "@clerk/nextjs";
import { ShieldX } from "lucide-react";

export default function NotAuthorizedPage() {
  const { signOut } = useClerk();

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-background p-8 text-center dark:border-zinc-800">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 text-rose-600">
          <ShieldX className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Not authorized
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account doesn&rsquo;t have access to the admin panel. If you think
          this is a mistake, contact your administrator.
        </p>
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
