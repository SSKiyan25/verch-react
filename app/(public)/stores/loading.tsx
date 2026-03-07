export default function StoresLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>

        {/* Search bar skeleton */}
        <div className="h-10 w-full max-w-xl animate-pulse rounded-xl bg-muted" />

        {/* Result count skeleton */}
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              {/* Cover */}
              <div className="aspect-[3/1] w-full animate-pulse bg-muted" />
              {/* Logo overlap */}
              <div className="px-4 -mt-7">
                <div className="h-14 w-14 animate-pulse rounded-full bg-muted border-2 border-background" />
              </div>
              {/* Body */}
              <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="mt-2 flex gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
