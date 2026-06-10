import { ProductGridSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <div className="container-page py-10 md:py-16">
      <header className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-1/2 max-w-md animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      </header>
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-3">
          <div className="h-32 animate-pulse rounded-md bg-muted/50" />
          <div className="h-64 animate-pulse rounded-md bg-muted/50" />
        </aside>
        <div>
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
