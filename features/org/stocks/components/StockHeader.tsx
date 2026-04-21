"use client";

import { useRouter } from "next/navigation";
import { ProductWithDetails } from "@/lib/types/product";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, History, Save, RotateCcw } from "lucide-react";

interface StockHeaderProps {
  product: ProductWithDetails;
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  onViewHistory: () => void;
}

export function StockHeader({
  product,
  hasChanges,
  onSave,
  onReset,
  onViewHistory,
}: StockHeaderProps) {
  const router = useRouter();

  return (
    <div className="border-b bg-white sticky top-0 z-40">
      <div className="px-3 md:px-6 py-3 md:py-4">
        {/* Top Row: Back Button */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/org/products")}
            className="p-2 h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            <h1 className="text-base md:text-xl font-semibold">
              Stock Management
            </h1>
          </div>
        </div>

        {/* Product Name */}
        <div className="mb-3">
          <p className="text-sm md:text-base text-muted-foreground line-clamp-1">
            {product.name}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {hasChanges ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="w-full sm:w-auto text-xs md:text-sm h-9"
              >
                <RotateCcw className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm h-9"
              >
                <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewHistory}
              className="w-full sm:w-auto text-xs md:text-sm h-9"
            >
              <History className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              View History
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
