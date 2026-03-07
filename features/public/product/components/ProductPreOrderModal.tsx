"use client";

import Image from "next/image";
import { CheckCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePreOrder } from "../hooks/usePreOrder";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    featured_photo_url: string | null;
    organization_name: string;
  };
  selectedVariation: {
    id: string;
    variation_name: string | null;
    attributes: Record<string, string>;
    price: number;
  } | null;
  preOrderState: ReturnType<typeof usePreOrder>;
};

export function ProductPreOrderModal({
  open,
  onOpenChange,
  product,
  selectedVariation,
  preOrderState,
}: Props) {
  const {
    quantity,
    setQuantity,
    fullName,
    setFullName,
    contactNumber,
    setContactNumber,
    notes,
    setNotes,
    isSubmitted,
    errors,
    handleSubmit,
    reset,
  } = preOrderState;

  const MAX_QTY = 10;

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  // Custom attribute chips (excluding synthetic "Variant" key)
  const customAttributes = selectedVariation
    ? Object.entries(selectedVariation.attributes).filter(
        ([k]) => k !== "Variant",
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        {/* ── Success state ── */}
        {isSubmitted ? (
          <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
            <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} />
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Pre-order Submitted!</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll contact you at{" "}
                <span className="font-medium text-foreground">
                  {contactNumber}
                </span>{" "}
                once your order is ready.
              </p>
            </div>
            <Button
              className="mt-2 w-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>Confirm Pre-order</DialogTitle>
            </DialogHeader>

            {/* ── Scrollable body ── */}
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5 max-h-[70vh]">
              {/* Product summary */}
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted border">
                  {product.featured_photo_url ? (
                    <Image
                      src={product.featured_photo_url}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {product.name}
                  </p>
                  {selectedVariation?.variation_name && (
                    <p className="text-xs text-muted-foreground">
                      {selectedVariation.variation_name}
                      {customAttributes.map(([k, v]) => (
                        <span key={k}>
                          {" · "}
                          {k}: {v}
                        </span>
                      ))}
                    </p>
                  )}
                  {selectedVariation && (
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(selectedVariation.price)}
                    </p>
                  )}
                </div>
              </div>

              {/* Info callout */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This is a pre-order. Your item will be reserved and shipped
                  once stock becomes available.
                </AlertDescription>
              </Alert>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <Label>Quantity</Label>
                <div className="flex items-center gap-1 rounded-md border w-fit">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-l-md text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(MAX_QTY, quantity + 1))}
                    disabled={quantity >= MAX_QTY}
                    className="flex h-8 w-8 items-center justify-center rounded-r-md text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pre-order-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pre-order-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan dela Cruz"
                  className={cn(errors.fullName && "border-destructive")}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>

              {/* Contact number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pre-order-contact">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pre-order-contact"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  inputMode="tel"
                  className={cn(errors.contactNumber && "border-destructive")}
                />
                {errors.contactNumber && (
                  <p className="text-xs text-destructive">
                    {errors.contactNumber}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pre-order-notes">
                  Notes{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="pre-order-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions?"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <DialogFooter className="px-6 py-4 border-t gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Confirm Pre-order
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
