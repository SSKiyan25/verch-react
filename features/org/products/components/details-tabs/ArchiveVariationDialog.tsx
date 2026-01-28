/* eslint-disable react/no-unescaped-entities */
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, AlertTriangle } from "lucide-react";
import { ProductVariation } from "@/lib/types/product";
import { getVariationDisplayName } from "@/lib/utils/product-utils";

interface ArchiveVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation: ProductVariation | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ArchiveVariationDialog({
  open,
  onOpenChange,
  variation,
  onConfirm,
  isLoading = false,
}: ArchiveVariationDialogProps) {
  if (!variation) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Archive Variation
          </AlertDialogTitle>
          {/* Add the AlertDialogDescription here */}
          <AlertDialogDescription>
            Are you sure you want to archive "
            {getVariationDisplayName(variation)}"? This will hide the variation
            from customers but preserve existing orders and stock levels.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          {variation.sku && (
            <div className="text-sm">
              <span className="font-medium">SKU:</span> {variation.sku}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-amber-800">
              What happens when you archive:
            </div>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Variation will be hidden from customers</li>
              <li>• Existing orders will not be affected</li>
              <li>• Stock levels will be preserved</li>
              <li>• Can be restored later if needed</li>
            </ul>
          </div>

          {variation.available_quantity > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Note:</span> This variation has{" "}
                <span className="font-semibold">
                  {variation.available_quantity}
                </span>{" "}
                items in stock that will become unavailable for purchase.
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Archive Variation
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
