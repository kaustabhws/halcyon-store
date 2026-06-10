import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";

export const metadata = { title: "Create account" };

function safeNext(raw: string | string[] | undefined): string {
  if (typeof raw !== "string") return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (session?.user?.id) redirect(next);

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-sm">
        <header className="space-y-2 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background text-sm font-bold">
              E
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-zinc-500">It takes about a minute.</p>
        </header>

        <div className="mt-8 space-y-6">
          <GoogleButton next={next} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-zinc-500">or</span>
            <Separator className="flex-1" />
          </div>
          <SignupForm next={next} />
        </div>
      </div>
    </div>
  );
}
