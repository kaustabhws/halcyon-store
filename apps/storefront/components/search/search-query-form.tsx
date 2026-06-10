"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Inline query form on /search. Submits as a GET so the URL stays the source
 * of truth, which means filters & pagination are preserved across reloads
 * and shareable as links.
 */
export function SearchQueryForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(initialQuery);

  React.useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    const q = value.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search products, brands, colors…"
          className="h-10 pl-9"
          autoFocus={!initialQuery}
        />
      </div>
      <Button type="submit" size="lg">
        Search
      </Button>
    </form>
  );
}
