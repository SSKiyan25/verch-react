"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductWithDetails } from "@/lib/types/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import {
  Edit,
  Package,
  AlertTriangle,
  Eye,
  Images,
  BarChart3,
  ShoppingCart,
  Percent,
  Truck,
} from "lucide-react";
// import { StockManagementDialog } from "./stock/StockManagementDialog";
import { EditProductModal } from "./edit/EditProductModal";
import {
  VariationsTab,
  SettingsTab,
  PhotosTab,
  DiscountTab,
  SupplierTab,
} from "./details-tabs";
import {
  getProductStatusColor,
  getStockStatusColor,
  getTotalStock,
  isLowStock,
  isOutOfStock,
} from "@/lib/utils/product-utils";

interface ProductDetailsModalProps {
  product: ProductWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdate: (product: ProductWithDetails) => void;
}

export function ProductDetailsModal({
  product,
  open,
  onOpenChange,
  onProductUpdate,
}: ProductDetailsModalProps) {
  const router = useRouter();
  // const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const totalStock = getTotalStock(product.variations);
  const lowStock = isLowStock(totalStock);
  const outOfStock = isOutOfStock(totalStock);

  const handleEditProduct = () => {
    setEditModalOpen(true);
  };

  const handleEditSave = (updatedData: ProductWithDetails) => {
    onProductUpdate(updatedData);
    // console.log("Product updated in details modal:", updatedData);
  };

  const handleManageStock = () => {
    router.push(`/org/products/${product.id}/stocks`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Eye className="w-5 h-5" />
              <span className="truncate">{product.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Product Header - Mobile Optimized */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/3">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted max-w-sm mx-auto lg:max-w-none">
                  {product.featured_photo_url ? (
                    <ImageWithLoading
                      src={product.featured_photo_url}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getProductStatusColor(product.status)}>
                    {product.status}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline">{product.category.name}</Badge>
                  )}
                  {(outOfStock || lowStock) && (
                    <Badge
                      variant="secondary"
                      className={getStockStatusColor(totalStock)}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {outOfStock ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm sm:text-base">
                  {product.description || "No description available"}
                </p>

                {/* Stats Grid - Mobile Optimized */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Total Sales
                    </div>
                    <div className="font-semibold text-sm sm:text-base">
                      ₱{product.total_sales.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Total Orders
                    </div>
                    <div className="font-semibold text-sm sm:text-base">
                      {product.total_orders}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Total Stock
                    </div>
                    <div
                      className={`font-semibold text-sm sm:text-base ${getStockStatusColor(
                        totalStock
                      )}`}
                    >
                      {totalStock}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Variations
                    </div>
                    <div className="font-semibold text-sm sm:text-base">
                      {product.variations?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditProduct}
                    className="w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageStock}
                    className="w-full sm:w-auto"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Manage Stock
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto justify-start"
                    onClick={() => {
                      // TODO: Navigate to analytics page
                      console.log("Navigate to analytics");
                    }}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto justify-start"
                    onClick={() => {
                      // TODO: Navigate to orders page with product filter
                      console.log("Navigate to orders for this product");
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    View Orders
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs - Mobile Optimized */}
            <Tabs defaultValue="variations" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                <TabsTrigger
                  value="variations"
                  className="text-xs sm:text-sm px-2 py-2"
                >
                  <span className="hidden sm:inline">Variations</span>
                  <span className="sm:hidden">Vars</span>
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="text-xs sm:text-sm px-2 py-2"
                >
                  <Images className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Photos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="discount"
                  className="text-xs sm:text-sm px-2 py-2"
                >
                  <Percent className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Discount</span>
                </TabsTrigger>
                <TabsTrigger
                  value="supplier"
                  className="text-xs sm:text-sm px-2 py-2"
                >
                  <Truck className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Supplier</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="text-xs sm:text-sm px-2 py-2"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="variations" className="mt-4">
                <VariationsTab product={product} />
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <PhotosTab
                  product={product}
                  onProductUpdate={onProductUpdate}
                />
              </TabsContent>

              <TabsContent value="discount" className="mt-4">
                <DiscountTab product={product} />
              </TabsContent>

              <TabsContent value="supplier" className="mt-4">
                <SupplierTab
                  product={product}
                  organizationId={product.organization_id}
                  onProductUpdate={onProductUpdate}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <SettingsTab product={product} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Removed StockManagementDialog - now navigates to dedicated page */}

      {/* Edit Product Modal */}
      <EditProductModal
        product={product}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleEditSave}
      />
    </>
  );
}
