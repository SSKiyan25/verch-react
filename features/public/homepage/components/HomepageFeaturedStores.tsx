import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StoreCard } from "@/features/public/stores";
import type { PublicStoreListItem } from "@/lib/supabase/queries/stores";

type Props = {
  stores: PublicStoreListItem[];
};

export function HomepageFeaturedStores({ stores }: Props) {
  // Show all stores (already limited to 6 in data fetcher)
  const displayStores = stores.slice(0, 6);

  if (displayStores.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Featured Stores
          </h2>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  );
}
