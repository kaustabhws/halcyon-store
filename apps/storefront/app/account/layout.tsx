import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { mergeCartAfterLoginAction } from "@/lib/auth-actions";
import { AccountTabs } from "@/components/account/account-tabs";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Best-effort cart merge — runs once when a freshly logged-in user lands
  // on /account. No-op if no anonymous cart cookie remains.
  await mergeCartAfterLoginAction(session.user.id);

  return (
    <div className="container-page py-12 md:py-16">
      <header className="border-b pb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {session.user.name ?? session.user.email}
        </h1>
        <AccountTabs />
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}
