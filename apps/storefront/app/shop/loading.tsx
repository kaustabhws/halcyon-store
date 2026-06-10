import { ProductGridSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <div className="container-page py-12 md:py-20">
      <header className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-12 w-2/3 max-w-md animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 max-w-lg animate-pulse rounded bg-muted" />
      </header>
      <div className="mt-10 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
      <div className="mt-10">
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
