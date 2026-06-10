import Link from "next/link";
import { NewAttributeForm } from "@/components/attributes/new-form";

export const metadata = { title: "New attribute" };

export default function NewAttributePage() {
  return (
    <div className="max-w-2xl space-y-6 p-8">
      <header>
        <Link
          href="/attributes"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All attributes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New attribute</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Once created, you'll add the values it can take (e.g. for "Size":
          UK 7, UK 8, UK 9).
        </p>
      </header>
      <NewAttributeForm />
    </div>
  );
}
