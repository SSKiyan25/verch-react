"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface OrgSubtotal {
  orgName: string;
  subtotal: number;
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
        "Proceed to Checkout"
      ) : (
        <Link href={checkoutHref}>Proceed to Checkout</Link>
      )}
    </Button>
  );

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold">Order Summary</h2>
      <Separator />

      {/* Per-org subtotals */}
      <div className="space-y-2">
        {orgSubtotals.map((org) => (
          <div
            key={org.orgName}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground truncate mr-2">
              {org.orgName}
            </span>
            <span>
              ₱
              {org.subtotal.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} items selected
      </p>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-semibold text-lg">
          ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
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
