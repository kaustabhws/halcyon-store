export default function Loading() {
  return (
    <div className="container-page py-12 md:py-20">
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div className="aspect-4/5 animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-9 w-16 animate-pulse rounded-full bg-muted"
                />
              ))}
            </div>
          </div>
          <div className="h-12 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
