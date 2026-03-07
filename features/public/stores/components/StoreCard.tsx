import Image from "next/image";
import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import type { PublicStoreListItem } from "@/lib/supabase/queries/stores";

type StoreCardProps = {
  store: PublicStoreListItem;
};

export function StoreCard({ store }: StoreCardProps) {
  const memberSince = new Date(store.date_created).getFullYear();

  // Prefer first non-empty, non-'N/A' value from campus, faculty, department, description
  function pickLocation(address: Record<string, unknown>): string | null {
    const candidates = [
      address?.campus,
      address?.faculty,
      address?.department,
      address?.description,
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
  const location = pickLocation(store.address);

  const productLabel =
    store.product_count === 0
      ? "No products yet"
      : `${store.product_count} ${store.product_count === 1 ? "product" : "products"}`;

  return (
    <Link
      href={`/stores/${store.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Cover image */}
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
        {store.cover_image_url ? (
          <Image
            src={store.cover_image_url}
            alt={`${store.name} cover`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/25" />
        )}
      </div>

      {/* Logo avatar — overlaps cover */}
      <div className="relative px-4 -mt-7">
        <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-background bg-background shadow-sm ring-2 ring-border">
          {store.logo_image_url ? (
            <Image
              src={store.logo_image_url}
              alt={`${store.name} logo`}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-lg font-bold text-primary uppercase">
              {store.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        {/* Name */}
        <h3 className="text-lg font-semibold leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {store.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {store.description ?? "No description available."}
        </p>

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {/* Product count chip */}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Package className="h-3 w-3 shrink-0" />
            {productLabel}
          </span>

          {/* Location */}
          {location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </span>
          )}

          {/* Member since */}
          <span className="ml-auto text-xs text-muted-foreground/70 whitespace-nowrap">
            Since {memberSince}
          </span>
        </div>
      </div>
    </Link>
  );
}
