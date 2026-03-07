export default function StoreDetailLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="relative w-full aspect-[4/1] md:h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
      <div className="absolute left-1/2 top-0 z-10 mt-[calc(4rem-1.5rem)] -translate-x-1/2">
        <div className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-4 ring-white shadow-lg bg-muted animate-pulse" />
      </div>
      <div className="mt-16 flex flex-col items-center gap-2 px-4 text-center">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mt-2" />
        <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      {/* Products grid skeleton */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-4 w-40 rounded bg-muted animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm animate-pulse"
            >
              <div className="aspect-square w-full bg-muted" />
              <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-6 w-1/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
