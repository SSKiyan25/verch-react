"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { OrgProductDetail } from "@/lib/types/org-products";
import type { ProductWithDetails, ProductVariation } from "@/lib/types/product";
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
import {
  VariationsTab,
  SettingsTab,
  PhotosTab,
  DiscountTab,
  SupplierTab,
} from "./details-tabs";
import { EditProductModal } from "./edit/EditProductModal";
import { toast } from "sonner";
import { getProductDetailAction } from "../actions/getProductDetailAction";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductDetailsModalProps {
  productId: string;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Convert OrgProductDetail to ProductWithDetails for tab components
function convertToProductWithDetails(
  detail: OrgProductDetail,
): ProductWithDetails {
  const variations: ProductVariation[] = detail.variations.map((v) => ({
    id: v.id,
    product_id: detail.id,
    sku: v.sku,
    attributes: v.attributes,
    variation_name: v.variation_name,
    price: v.price,
    compare_at_price: v.compare_at_price,
    stock_quantity: v.stock_quantity,
    reserved_quantity: v.reserved_quantity,
    available_quantity: v.available_quantity,
    pre_order_quantity: v.pre_order_quantity,
    is_available: v.is_available,
    is_archived: v.is_archived,
    created_at: v.created_at,
    updated_at: v.updated_at,
    completed_orders: v.completed_orders,
    cancelled_orders: v.cancelled_orders,
    last_stock_update: v.updated_at,
  }));

  // console.log("Converted product with details:", {
  //   ...detail,
  //   variations,
  // });

  return {
    id: detail.id,
    account_id: "", // Not needed for org context
    organization_id: "", // Not needed for org context
    name: detail.name,
    status: detail.status,
    description: detail.description,
    search_keywords: detail.search_keywords,
    is_approved: detail.is_approved,
    total_sales: 0, // Not available in OrgProductDetail
    total_orders: 0, // Not available in OrgProductDetail
    is_discounted: detail.is_discounted,
    discount_type:
      detail.discount_type === "none"
        ? "none"
        : detail.discount_type === "percentage"
          ? "percentage"
          : "fixed_amount",
    discount_target: detail.discount_target,
    discount_value: detail.discount_value ?? 0,
    featured_photo_url: detail.featured_photo_url,
    photo_urls: detail.photo_urls,
    can_pre_order: detail.can_pre_order,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
    is_archived: detail.is_archived,
    category_id: detail.category_id,
    supplier_id: detail.supplier_id,
    variations,
    // Add category and supplier objects if needed by tabs
    category: detail.category_name
      ? {
          id: detail.category_id!,
          organization_id: null,
          name: detail.category_name,
          slug: "",
          description: null,
          parent_id: null,
          sort_order: 0,
          is_active: true,
          is_custom: false,
          icon: null,
          created_at: "",
          updated_at: "",
        }
      : undefined,
    supplier: detail.supplier_name
      ? {
          id: detail.supplier_id!,
          organization_id: "",
          name: detail.supplier_name,
          description: null,
          contact_number: detail.supplier_contact_number,
          contact_email: detail.supplier_contact_email,
          address: {},
          links: [],
          created_at: "",
          updated_at: "",
          is_archived: false,
        }
      : undefined,
  };
}

export function ProductDetailsModal({
  productId,
  orgId,
  open,
  onOpenChange,
}: ProductDetailsModalProps) {
  const router = useRouter();
  const [product, setProduct] = useState<OrgProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch full product detail when modal opens
  useEffect(() => {
    // Reset state when modal closes
    if (!open) {
      setProduct(null);
      setError(null);
      return;
    }

    if (!productId || !orgId) return;

    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setProduct(null);
      setError(null);

      try {
        const result = await getProductDetailAction(productId, orgId);

        if (cancelled) return;

        if (!result.success) {
          setError(result.error);
          toast.error("Failed to load product details");
          return;
        }

        setProduct(result.data);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load product details";
        setError(message);
        console.error("Error fetching product details:", err);
        toast.error(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, productId, orgId, refreshKey]);

  // Calculate stock status
  const totalStock = product
    ? product.variations.reduce(
        (sum, v) => sum + (v.available_quantity || 0),
        0,
      )
    : 0;
  const totalSold = product
    ? product.variations.reduce((sum, v) => sum + (v.completed_orders || 0), 0)
    : 0;
  const lowStock = totalStock < 10 && totalStock > 0;
  const outOfStock = totalStock === 0;

  const getProductStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "archived":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return "text-red-600";
    if (stock < 10) return "text-yellow-600";
    return "text-green-600";
  };

  const handleManageStock = () => {
    if (!product) return;
    router.push(`/org/products/${product.id}/stocks`);
  };

  const handleEditProduct = () => {
    setEditOpen(true);
  };

  const handleRefresh = () => {
    // Increment refreshKey to trigger useEffect re-fetch
    setRefreshKey((prev) => prev + 1);
    // Also refresh Server Components (forces page to refetch)
    router.refresh();
  };

  const handleProductSave = async (updatedProduct: ProductWithDetails) => {
    try {
      // 1. Optimistic Local Update: instantly update the UI
      setProduct((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          name: updatedProduct.name,
          description: updatedProduct.description ?? null,
          search_keywords: updatedProduct.search_keywords ?? [],
          category_id: updatedProduct.category_id ?? null,
          // Also update category name if it changed
          category_name:
            updatedProduct.category?.name ??
            (updatedProduct.category_id === prev.category_id
              ? prev.category_name
              : null),
        };
      });

      // 2. Close the edit modal immediately - optimistic update is already applied
      setEditOpen(false);

      // 3. Trigger server component refresh in background
      // The revalidatePath in the server action ensures the page will refetch
      router.refresh();

      // 4. Optionally trigger client-side refetch for this modal's data
      // This ensures joined fields like category names are synced
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("[ProductDetailsModal] handleProductSave error:", error);
      toast.error("Failed to refresh product data");
    }
  };

  // Convert product for tabs (only if product exists)
  const productForTabs = product ? convertToProductWithDetails(product) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Eye className="w-5 h-5" />
            <span className="truncate">{product?.name || "Loading..."}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <Skeleton className="w-full lg:w-1/3 aspect-square rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  getProductDetailAction(productId, orgId).then((result) => {
                    if (result.success) {
                      setProduct(result.data);
                    } else {
                      setError(result.error);
                    }
                    setIsLoading(false);
                  });
                }}
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Product Content */}
        {!isLoading && !error && product && productForTabs && (
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
                  {product.category_name && (
                    <Badge variant="outline">{product.category_name}</Badge>
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
                      Total Stock
                    </div>
                    <div
                      className={`font-semibold text-sm sm:text-base ${getStockStatusColor(
                        totalStock,
                      )}`}
                    >
                      {totalStock}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Units Sold
                    </div>
                    <div className="font-semibold text-sm sm:text-base text-blue-600">
                      {totalSold}
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
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      Status
                    </div>
                    <div className="font-semibold text-sm sm:text-base">
                      {product.is_approved ? "Approved" : "Pending"}
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
                <VariationsTab
                  key={`variations-${product.id}`}
                  product={productForTabs}
                  orgId={orgId}
                  isLoadingProduct={false}
                />
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <PhotosTab
                  product={productForTabs}
                  onProductUpdate={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="discount" className="mt-4">
                <DiscountTab product={productForTabs} />
              </TabsContent>

              <TabsContent value="supplier" className="mt-4">
                <SupplierTab
                  product={productForTabs}
                  organizationId={orgId}
                  onProductUpdate={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <SettingsTab
                  product={productForTabs}
                  onProductUpdate={handleRefresh}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>

      {/* Edit Product Modal */}
      {product && productForTabs && (
        <EditProductModal
          product={productForTabs}
          orgId={orgId}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={handleProductSave}
        />
      )}
    </Dialog>
  );
}
