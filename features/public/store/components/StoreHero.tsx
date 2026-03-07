import Image from "next/image";
import { MapPin, Package, CalendarDays } from "lucide-react";
import type { PublicStoreDetail } from "@/lib/supabase/queries/stores";

function getLocation(address: Record<string, unknown>): string | null {
  const candidates = [
    address?.city,
    address?.province,
    address?.campus,
    address?.faculty,
    address?.department,
  ];
  for (const val of candidates) {
    if (
      typeof val === "string" &&
      val.trim() &&
      val.trim().toLowerCase() !== "n/a"
    ) {
      return val.trim();
    }
  }
  return null;
}

type StoreHeroProps = {
  store: PublicStoreDetail;
};

export function StoreHero({ store }: StoreHeroProps) {
  const memberSince = new Date(store.date_created).getFullYear();
  const location = getLocation(store.address);
  const productLabel =
    store.product_count === 0
      ? "No products yet"
      : `${store.product_count} ${
          store.product_count === 1 ? "product" : "products"
        }`;

  return (
    <header className="w-full bg-background">
      {/* ── Cover ─────────────────────────────────────────────── */}
      <div className="relative h-48 md:h-60 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/8 to-accent/20">
        {store.cover_image_url && (
          <Image
            src={store.cover_image_url}
            alt={`${store.name} cover`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
        {/* Subtle bottom scrim so the logo pops */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* ── Identity row ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Logo — pulled up, overlapping cover bottom */}
        <div className="-mt-12 mb-3 flex items-end gap-4">
          <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-background shadow-lg">
            {store.logo_image_url ? (
              <Image
                src={store.logo_image_url}
                alt={`${store.name} logo`}
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10">
                <span className="text-3xl font-bold text-primary uppercase">
                  {store.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          {/* Name lives beside logo, bottom-aligned so it clears the negative margin */}
          <div className="pb-1">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {store.name}
            </h1>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-3 leading-relaxed">
          {store.description ?? "No description available."}
        </p>

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-6">
          {location && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {productLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Member since {memberSince}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />
    </header>
  );
}
