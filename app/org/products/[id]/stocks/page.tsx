"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { useProduct } from "@/lib/hooks/products/use-product";
import { StockHeader } from "@/features/org/stocks/components/StockHeader";
import { StockOverview } from "@/features/org/stocks/components/StockOverview";
import { VariationsList } from "@/features/org/stocks/components/VariationsList";
import { StockHistorySection } from "@/features/org/stocks/components/StockHistorySection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockAdjustments } from "@/features/org/stocks/hooks/useStockAdjustments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function StockManagementPage() {
  const params = useParams();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("manage");

  const productId = params.id as string;
  const organizationId = user?.organization_id ?? undefined;

  // Fetch product data
  const {
    product,
    loading,
    error,
    refetch: refetchProduct,
  } = useProduct({
    organizationId,
    productId,
    enabled: !!organizationId && !!productId,
  });

  // Stock adjustments hook
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
  } = useStockAdjustments(product!);

  const handleSave = async () => {
    if (!product || !organizationId) return;

    try {
      // Convert adjustments object to array format expected by API
      const adjustmentsArray = Object.values(adjustments).map((adj) => ({
        variationId: adj.variationId,
        adjustment: adj.adjustment,
        action: adj.action,
        reason: adj.reason,
      }));

      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}/stock-adjustments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adjustments: adjustmentsArray }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply stock adjustments");
      }

      // Show success toast
      toast.success("Stock adjustments applied successfully");

      // Reset adjustments and refetch product data
      await applyAdjustments();
      await refetchProduct();

      // Switch to history tab to show the new changes
      setActiveTab("history");
    } catch (error) {
      console.error("Failed to apply stock adjustments:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to apply stock adjustments"
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="animate-pulse">
            <div className="h-12 bg-muted rounded mb-4"></div>
            <div className="h-32 bg-muted rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product || !organizationId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Failed to load product. Please try again."}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manage">Manage Stock</TabsTrigger>
            <TabsTrigger value="history">Stock History</TabsTrigger>
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
            <StockHistorySection
              product={product}
              organizationId={organizationId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
