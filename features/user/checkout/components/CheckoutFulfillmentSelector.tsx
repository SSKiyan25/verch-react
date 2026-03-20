"use client";

import { Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FulfillmentMethod } from "@/lib/supabase/queries/orders";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

interface CheckoutFulfillmentSelectorProps {
  orgId: string;
  selectedMethod: FulfillmentMethod;
  selectedAddressId: string | null;
  userAddresses: UserAddress[];
  onChange: (method: FulfillmentMethod, addressId: string | null) => void;
}

export function CheckoutFulfillmentSelector({
  selectedMethod,
  onChange,
}: CheckoutFulfillmentSelectorProps) {
  const handleMethodChange = (method: FulfillmentMethod) => {
    if (method === "pickup") {
      onChange("pickup", null);
    }
    // Delivery is temporarily disabled
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fulfillment</p>

      {/* Toggle buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={selectedMethod === "pickup" ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 gap-1.5",
            selectedMethod === "pickup" && "shadow-none",
          )}
          onClick={() => handleMethodChange("pickup")}
        >
          <Store className="h-4 w-4" />
          Pickup
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          disabled
        >
          <Truck className="h-4 w-4" />
          Delivery
        </Button>
      </div>

      {/* Delivery coming soon notice */}
      <p className="text-xs text-muted-foreground">
        Delivery is not yet available. Check back soon.
      </p>
    </div>
  );
}
