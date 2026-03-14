"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyAddressesProps {
  onAdd: () => void;
}

export function EmptyAddresses({ onAdd }: EmptyAddressesProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No addresses saved</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your first delivery address to get started.
      </p>
      <Button className="mt-4" onClick={onAdd}>
        Add Address
      </Button>
    </div>
  );
}
