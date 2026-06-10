import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center">
      <div className="max-w-md">
        <p className="font-display text-7xl text-muted-foreground md:text-8xl">
          404
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Lost the trail.
        </h1>
        <p className="mt-4 text-muted-foreground">
          We couldn&rsquo;t find that page. It may have moved, or never existed.
          The shelf is still stocked.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">Browse the shelf</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
