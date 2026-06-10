import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AddAddressForm } from "@/components/account/add-address-form";
import { deleteAddressAction } from "@/lib/address-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { customerId: session.user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Saved addresses</h2>
        {addresses.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No addresses yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{a.fullName}</p>
                  {a.isDefault ? (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] uppercase tracking-widest">
                      Default
                    </span>
                  ) : null}
                </div>
                <address className="mt-2 not-italic text-sm text-zinc-600 dark:text-zinc-400">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                  {a.city}, {a.state} {a.postalCode}<br />
                  {a.country}
                  {a.phone ? <><br />{a.phone}</> : null}
                </address>
                <form action={deleteAddressAction} className="mt-4">
                  <input type="hidden" name="id" value={a.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Add an address</h2>
        <AddAddressForm />
      </section>
    </div>
  );
}
