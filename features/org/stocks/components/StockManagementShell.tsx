"use client";

import { useState } from "react";
import { StockHeader } from "@/features/org/stocks/components/StockHeader";
import { StockOverview } from "@/features/org/stocks/components/StockOverview";
import { VariationsList } from "@/features/org/stocks/components/VariationsList";
import { StockHistorySection } from "@/features/org/stocks/components/StockHistorySection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockAdjustments } from "@/features/org/stocks/hooks/useStockAdjustments";
import { useStockAdjustment } from "@/features/org/stocks/hooks/useStockAdjustment";
import type { ProductWithDetails } from "@/lib/types/product";

interface StockManagementShellProps {
  product: ProductWithDetails;
  orgId: string;
  productId: string;
  defaultTab?: "manage" | "history";
}

export function StockManagementShell({
  product,
  orgId,
  productId,
  defaultTab = "manage",
}: StockManagementShellProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Stock adjustments hook (manages local form state)
  const {
    adjustments,
    hasChanges,
    getTotalAdjustment,
    handleStockChange,
    handleReasonChange,
    getNewStock,
    getNewReserved,
    resetAdjustments,
    applyAdjustments,
  } = useStockAdjustments(product);

  // Stock adjustment submission hook (calls Server Action)
  const { submitAdjustments, isSubmitting } = useStockAdjustment({
    orgId,
    productId,
    onSuccess: () => {
      applyAdjustments();
      setActiveTab("history");
    },
  });

  const handleSave = async () => {
    // Convert adjustments object to array format expected by action
    const adjustmentsArray = Object.values(adjustments).map((adj) => ({
      variationId: adj.variationId,
      adjustment: adj.adjustment,
      action: adj.action,
      reason: adj.reason,
    }));

    await submitAdjustments(adjustmentsArray);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <StockHeader
        product={product}
        hasChanges={hasChanges}
        onSave={handleSave}
        onReset={resetAdjustments}
        onViewHistory={() => setActiveTab("history")}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Stock Overview - Always visible */}
        <div className="mb-6">
          <StockOverview
            product={product}
            totalAdjustment={getTotalAdjustment()}
            hasChanges={hasChanges}
          />
        </div>

        {/* Tabs for Manage vs History */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "manage" | "history")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manage" disabled={isSubmitting}>
              Manage Stock
            </TabsTrigger>
            <TabsTrigger value="history" disabled={isSubmitting}>
              Stock History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            {/* Variations List */}
            <VariationsList
              product={product}
              adjustments={adjustments}
              getNewStock={getNewStock}
              getNewReserved={getNewReserved}
              onStockChange={handleStockChange}
              onReasonChange={handleReasonChange}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Stock History */}
            <StockHistorySection product={product} organizationId={orgId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
