"use client";

import { Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/supabase/queries/orders";

interface CheckoutPaymentSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "cash",
    label: "Cash",
    description: "Pay in person",
    icon: <Banknote className="h-5 w-5" />,
  },
  {
    value: "gcash",
    label: "GCash",
    description: "You'll upload proof after placing",
    icon: <Smartphone className="h-5 w-5" />,
  },
];

export function CheckoutPaymentSelector({
  selected,
  onChange,
}: CheckoutPaymentSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Payment</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {option.icon}
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
