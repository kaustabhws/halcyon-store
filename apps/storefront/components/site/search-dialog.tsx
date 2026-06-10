"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { BRAND } from "@ecom/shared/brand";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

type SearchHit = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  primaryImageUrl: string | null;
  minPricePaise: number;
  maxPricePaise: number;
  inStock: boolean;
};

type SearchResponse =
  | {
      ok: true;
      hits: SearchHit[];
      totalHits: number;
      suggestion: string | null;
      processingTimeMs: number;
    }
  | { error: string };

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  // Tiny in-memory cache so re-typing the same prefix is instant.
  const cacheRef = React.useRef<
    Map<string, { hits: SearchHit[]; suggestion: string | null }>
  >(new Map());
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K toggles the dialog from anywhere on the storefront.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setSuggestion(null);
      setError(null);
      setActiveIndex(0);
    } else {
      // Focus the input shortly after the dialog mounts to avoid the focus
      // being stolen by Radix's focus trap on initial mount.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced fetch as the user types. Each new keystroke aborts the prior
  // in-flight request so we never paint stale results when the user types
  // faster than the API can respond.
  React.useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = q.trim();
    if (term.length === 0) {
      setResults([]);
      setSuggestion(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cache hit → paint instantly. Background re-fetch only if the user
    // pauses typing (still in-flight via the timeout below).
    const cached = cacheRef.current.get(term);
    if (cached) {
      setResults(cached.hits);
      setSuggestion(cached.suggestion);
      setError(null);
      setActiveIndex(0);
    } else {
      setLoading(true);
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}&hitsPerPage=8`,
          { cache: "no-store", signal: ctrl.signal },
        );
        const body = (await res.json()) as SearchResponse;
        if (ctrl.signal.aborted) return;
        if ("error" in body) {
          setError(body.error);
          setResults([]);
          setSuggestion(null);
        } else {
          setError(null);
          setResults(body.hits);
          setSuggestion(body.suggestion);
          setActiveIndex(0);
          cacheRef.current.set(term, {
            hits: body.hits,
            suggestion: body.suggestion,
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) {
        router.push(`/product/${target.slug}`);
        setOpen(false);
      } else if (q.trim().length > 0) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
        setOpen(false);
      }
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search products by name, brand, or attribute.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search products, brands, colors…"
              className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
              Esc
            </kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {error ? (
              <div className="p-6 text-center text-sm text-rose-600">{error}</div>
            ) : q.trim().length === 0 ? (
              <EmptyHints onPick={(s) => setQ(s)} />
            ) : results.length === 0 && !loading ? (
              <div className="space-y-3 p-6 text-center text-sm text-muted-foreground">
                <p>No results for &ldquo;{q}&rdquo;.</p>
                {suggestion ? (
                  <p>
                    Did you mean{" "}
                    <button
                      type="button"
                      onClick={() => setQ(suggestion)}
                      className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
                    >
                      {suggestion}
                    </button>
                    ?
                  </p>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-1">
                {results.map((h, i) => (
                  <li key={h.id}>
                    <Link
                      href={`/product/${h.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2",
                        i === activeIndex
                          ? "bg-foreground text-background"
                          : "hover:bg-muted",
                      )}
                    >
                      <div
                        className={cn(
                          "relative h-12 w-12 shrink-0 overflow-hidden rounded-md",
                          i === activeIndex
                            ? "bg-background/10"
                            : "bg-muted",
                        )}
                      >
                        {h.primaryImageUrl ? (
                          <Image
                            src={h.primaryImageUrl}
                            alt={h.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h.name}</p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            i === activeIndex
                              ? "text-background/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {h.brandName ?? BRAND.name}
                          {!h.inStock ? " · Sold out" : ""}
                        </p>
                      </div>
                      <span className="text-xs tabular-nums">
                        {h.minPricePaise === h.maxPricePaise
                          ? formatPrice(BigInt(h.minPricePaise))
                          : `${formatPrice(BigInt(h.minPricePaise))} +`}
                      </span>
                    </Link>
                  </li>
                ))}
                {q.trim().length > 0 ? (
                  <li className="border-t pt-2">
                    <Link
                      href={`/search?q=${encodeURIComponent(q)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span>See all results for &ldquo;{q}&rdquo;</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyHints({ onPick }: { onPick: (s: string) => void }) {
  const hints = ["sneakers", "watches", "headphones", "black", "wireless"];
  return (
    <div className="space-y-3 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Try
      </p>
      <div className="flex flex-wrap gap-2">
        {hints.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onPick(h)}
            className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
