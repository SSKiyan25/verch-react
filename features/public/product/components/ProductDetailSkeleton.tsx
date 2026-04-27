/**
 * Skeleton loading state for the product detail page.
 * Mirrors the two-column layout of ProductDetail.tsx.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-6">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left — Image gallery skeleton */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-16 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>

          {/* Right — Product info + actions skeleton */}
          <div className="flex flex-col gap-8">
            {/* ProductInfo skeleton */}
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-7 w-1/2 animate-pulse rounded bg-muted" />

              {/* Badges */}
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              </div>

              {/* Price */}
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />

              {/* Description lines */}
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>

            {/* Variant cards + CTA skeleton */}
            <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
              {/* Variant header */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>

              {/* Variant card grid */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 w-28 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>

              {/* Separator */}
              <div className="h-px w-full bg-border" />

              {/* CTA button */}
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            </div>

            {/* Organization card skeleton */}
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
