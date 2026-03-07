import { Store } from "lucide-react";

export function StoresHeader() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Browse Stores
        </h1>
      </div>
      <p className="text-sm text-muted-foreground sm:text-base">
        Discover sellers and student organizations on Verch
      </p>
    </div>
  );
}
