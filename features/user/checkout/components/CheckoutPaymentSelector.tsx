"use client";

import { Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PaymentMethod } from "@/lib/supabase/queries/orders";

interface CheckoutPaymentSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  hasGCashConfigured: boolean;
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
  hasGCashConfigured,
}: CheckoutPaymentSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Payment</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          const isGCash = option.value === "gcash";
          const isDisabled = isGCash && !hasGCashConfigured;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
                isDisabled &&
                  "cursor-not-allowed opacity-50 hover:bg-background",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground",
                  isDisabled && "text-muted-foreground/50",
                )}
              >
                {option.icon}
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                    isDisabled && "text-muted-foreground/70",
                  )}
                >
                  {option.label}
                </p>
                <p
                  className={cn(
                    "text-xs text-muted-foreground mt-0.5 leading-tight",
                    isDisabled && "text-muted-foreground/70",
                  )}
                >
                  {isDisabled
                    ? "Organization hasn't configured GCash"
                    : option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {!hasGCashConfigured && (
        <Alert className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
          <AlertDescription className="text-xs text-orange-800 dark:text-orange-300">
            GCash payment is unavailable because this organization hasn&apos;t
            set up their GCash account yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
