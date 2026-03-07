import { Store } from "lucide-react";
import type { PublicStoreListItem } from "@/lib/supabase/queries/stores";
import { StoreCard } from "./StoreCard";

type StoresGridProps = {
  stores: PublicStoreListItem[];
  totalCount: number;
};

export function StoresGrid({ stores, totalCount }: StoresGridProps) {
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Store className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            No stores found
          </p>
          <p className="text-sm text-muted-foreground">
            Try a different search term or clear the filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{totalCount}</span>{" "}
        {totalCount === 1 ? "store" : "stores"} found
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}
