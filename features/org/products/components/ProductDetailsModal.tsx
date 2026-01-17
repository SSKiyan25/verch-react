"use client";

import { useState } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import {
  Edit,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Plus,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { StockManagementDialog } from "./stock/StockManagementDialog";

interface ProductDetailsModalProps {
  product: ProductWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsModal({
  product,
  open,
  onOpenChange,
}: ProductDetailsModalProps) {
  const [stockModalOpen, setStockModalOpen] = useState(false);

  const totalStock =
    product.variations?.reduce(
      (total, variation) => total + variation.available_quantity,
      0
    ) || 0;

  const isLowStock = totalStock < 10 && totalStock > 0;
  const isOutOfStock = totalStock === 0;

  const getStatusColor = (status: string) => {
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

  const getStockColor = () => {
    if (isOutOfStock) return "text-red-600";
    if (isLowStock) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {product.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Product Header */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-square rounded-lg overflow-hidden">
                  {product.featured_photo_url && (
                    <ImageWithLoading
                      src={product.featured_photo_url}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(product.status)}>
                    {product.status}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline">{product.category.name}</Badge>
                  )}
                  {(isOutOfStock || isLowStock) && (
                    <Badge variant="secondary" className={getStockColor()}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {isOutOfStock ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground">{product.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Sales</div>
                    <div className="font-semibold">
                      ₱{product.total_sales.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Orders</div>
                    <div className="font-semibold">{product.total_orders}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Stock</div>
                    <div className={`font-semibold ${getStockColor()}`}>
                      {totalStock}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Variations</div>
                    <div className="font-semibold">
                      {product.variations?.length || 0}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStockModalOpen(true)}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Manage Stock
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="variations" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="variations">Variations</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="variations" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Product Variations</h3>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variation
                  </Button>
                </div>

                <div className="grid gap-4">
                  {product.variations?.map((variation) => (
                    <Card key={variation.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {variation.variation_name ||
                                  `${Object.values(variation.attributes).join(
                                    ", "
                                  )}`}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {variation.sku}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div>Price: ₱{variation.price.toFixed(2)}</div>
                              <div>Stock: {variation.available_quantity}</div>
                              <div>Reserved: {variation.reserved_quantity}</div>
                              <div>Sold: {variation.completed_orders}</div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      Order history will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Sales Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      Analytics charts will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Product Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      Product settings will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Management Modal */}
      <StockManagementDialog
        product={product}
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
      />
    </>
  );
}
