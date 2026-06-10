export default function Loading() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="border-b pb-6">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-2/3 max-w-md animate-pulse rounded bg-muted" />
        <div className="mt-6 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
      </div>
      <div className="mt-10 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
