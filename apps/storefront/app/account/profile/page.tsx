import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Separator } from "@/components/ui/separator";
import {
  ProfileForm,
  PasswordForm,
} from "@/components/account/profile-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      marketingOptIn: true,
      passwordHash: true,
    },
  });

  const hasPassword = Boolean(customer.passwordHash);

  return (
    <div className="space-y-10">
      <section>
        <header className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Personal info</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used on orders and shipping labels.
          </p>
        </header>
        <ProfileForm
          defaults={{
            firstName: customer.firstName ?? "",
            lastName: customer.lastName ?? "",
            email: customer.email,
            phone: customer.phone ?? "",
            marketingOptIn: customer.marketingOptIn,
          }}
        />
      </section>

      <Separator />

      <section>
        <header className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasPassword
              ? "Update the password used to sign in."
              : "Your account uses Google sign-in. A password isn't set yet."}
          </p>
        </header>
        {hasPassword ? (
          <PasswordForm />
        ) : (
          <div className="rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
            You signed in with Google. We&rsquo;ll add password-add support
            shortly so you can sign in either way.
          </div>
        )}
      </section>
    </div>
  );
}
