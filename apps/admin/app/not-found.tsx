import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <div className="max-w-md">
        <p className="text-7xl font-semibold tracking-tight text-muted-foreground md:text-8xl">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Not found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The resource you were looking for doesn&rsquo;t exist or you don&rsquo;t
          have permission to view it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/orders">Orders</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
