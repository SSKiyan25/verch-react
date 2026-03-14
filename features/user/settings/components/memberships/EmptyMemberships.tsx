"use client";

import { Users } from "lucide-react";

export function EmptyMemberships() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No memberships yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Apply to an organization to access exclusive member discounts.
      </p>
    </div>
  );
}
