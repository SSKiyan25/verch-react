"use client";

import { useState } from "react";
import { MapPin, Store, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { CartOrg } from "@/lib/supabase/queries/user/cart";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";
import { setCartFulfillmentAction } from "@/features/user/cart/actions/setCartFulfillmentAction";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartFulfillmentDrawerProps {
  org: CartOrg | null;
  addresses: UserAddress[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFulfillmentUpdated: (
    orgId: string,
    method: "pickup" | "delivery",
    addressId: string | null,
  ) => void;
}

export function CartFulfillmentDrawer({
  org,
  addresses,
  open,
  onOpenChange,
  onFulfillmentUpdated,
}: CartFulfillmentDrawerProps) {
  const [method, setMethod] = useState<"pickup" | "delivery">(
    org?.fulfillment_method ?? "pickup",
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    org?.delivery_address_id ?? null,
  );
  const [saving, setSaving] = useState(false);

  // Reset state when org changes
  const orgId = org?.organization_id ?? null;
  const [prevOrgId, setPrevOrgId] = useState(orgId);
  if (orgId !== prevOrgId) {
    setPrevOrgId(orgId);
    setMethod(org?.fulfillment_method ?? "pickup");
    setSelectedAddressId(org?.delivery_address_id ?? null);
  }

  const canConfirm =
    method === "pickup" ||
    (method === "delivery" && selectedAddressId !== null);

  async function handleConfirm() {
    if (!org) return;
    setSaving(true);
    try {
      const result = await setCartFulfillmentAction({
        organization_id: org.organization_id,
        fulfillment_method: method,
        delivery_address_id: method === "delivery" ? selectedAddressId : null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onFulfillmentUpdated(
        org.organization_id,
        method,
        method === "delivery" ? selectedAddressId : null,
      );
      onOpenChange(false);
    } catch {
      toast.error("Failed to update fulfillment preference.");
    } finally {
      setSaving(false);
    }
  }

  if (!org) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{org.organization_name}</SheetTitle>
          <SheetDescription>
            Choose how you&apos;d like to receive items from this store.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          {/* Method cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod("pickup")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                method === "pickup"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50",
              )}
            >
              <Store className="h-6 w-6" />
              <span className="text-sm font-medium">Pickup</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("delivery")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                method === "delivery"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50",
              )}
            >
              <MapPin className="h-6 w-6" />
              <span className="text-sm font-medium">Delivery</span>
            </button>
          </div>

          {/* Address selection — only for delivery */}
          {method === "delivery" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Select a delivery address</p>
              {addresses.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No saved addresses found.
                  </p>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/user/settings/addresses">Add an address</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={cn(
                        "w-full text-left rounded-md border p-3 transition-colors",
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {addr.recipient_name}
                            <span className="ml-2 text-xs text-muted-foreground capitalize">
                              ({addr.label})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addr.street}
                            {addr.barangay ? `, ${addr.barangay}` : ""},{" "}
                            {addr.city}, {addr.province}
                            {addr.postal_code ? ` ${addr.postal_code}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addr.contact_number}
                          </p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {method === "delivery" &&
                selectedAddressId === null &&
                addresses.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Please select an address to continue.
                  </p>
                )}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="w-full"
          >
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
