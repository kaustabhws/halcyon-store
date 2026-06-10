import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 dark:bg-zinc-950">
      <SignIn appearance={{ elements: { card: "shadow-none border border-zinc-200 dark:border-zinc-800" } }} />
    </div>
  );
}
