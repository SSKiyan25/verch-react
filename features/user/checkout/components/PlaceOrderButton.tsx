"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceOrderButtonProps {
  isPlacing: boolean;
  disabled: boolean;
  grandTotal: number;
  onClick: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

export function PlaceOrderButton({
  isPlacing,
  disabled,
  grandTotal,
  onClick,
}: PlaceOrderButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isPlacing}
      className="w-full"
      size="lg"
    >
      {isPlacing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Placing order...
        </>
      ) : (
        `Place Order · ${formatCurrency(grandTotal)}`
      )}
    </Button>
  );
}
