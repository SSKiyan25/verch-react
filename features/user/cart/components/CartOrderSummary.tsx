"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface OrgSubtotal {
  orgName: string;
  originalSubtotal: number;
  discountAmount: number;
  finalSubtotal: number;
}

interface CartOrderSummaryProps {
  orgSubtotals: OrgSubtotal[];
  selectedCount: number;
  totalCount: number;
  total: number;
  disabledReasons: string[];
  checkoutHref: string;
}

export function CartOrderSummary({
  orgSubtotals,
  selectedCount,
  totalCount,
  total,
  disabledReasons,
  checkoutHref,
}: CartOrderSummaryProps) {
  const isDisabled = disabledReasons.length > 0 || selectedCount === 0;

  const tooltipText =
    selectedCount === 0
      ? "Select at least one item to checkout"
      : disabledReasons.join(" ");

  const checkoutButton = (
    <Button
      className="w-full"
      size="lg"
      disabled={isDisabled}
      asChild={!isDisabled}
    >
      {isDisabled ? (
        "Place Order"
      ) : (
        <Link href={checkoutHref}>
          Place Order · ₱
          {total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </Link>
      )}
    </Button>
  );

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold">Order Summary</h2>
      <Separator />

      {/* Per-org subtotals with discount breakdown */}
      <div className="space-y-3">
        {orgSubtotals.map((org) => (
          <div key={org.orgName} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {org.orgName}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                ₱
                {org.originalSubtotal.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {org.discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Auto discount
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  -₱
                  {org.discountAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Org total</span>
              <span>
                ₱
                {org.finalSubtotal.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} items selected
      </p>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-semibold">Grand Total</span>
        <span className="font-semibold text-lg">
          ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Discount note */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-3 py-2.5">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Promotion discounts shown above are estimates. The final discount will
          be calculated and applied during checkout.
        </p>
      </div>

      {isDisabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="block w-full">
              {checkoutButton}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      ) : (
        checkoutButton
      )}
    </div>
  );
}
