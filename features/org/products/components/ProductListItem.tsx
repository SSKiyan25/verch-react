"use client";

import { useState } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import {
  Edit,
  MoreHorizontal,
  Eye,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { StockManagementDialog } from "./stock/StockManagementDialog";

interface ProductListItemProps {
  product: ProductWithDetails;
}

export function ProductListItem({ product }: ProductListItemProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  const lowestPrice =
    product.variations?.reduce(
      (min, variation) => Math.min(min, variation.price),
      Infinity
    ) || 0;

  const highestPrice =
    product.variations?.reduce(
      (max, variation) => Math.max(max, variation.price),
      0
    ) || 0;

  const priceDisplay =
    lowestPrice === highestPrice
      ? `₱${lowestPrice.toFixed(2)}`
      : `₱${lowestPrice.toFixed(2)} - ₱${highestPrice.toFixed(2)}`;

  // Calculate total stock across variations
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

  // Helper function to format status text
  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="flex-shrink-0 relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden">
                {product.featured_photo_url && (
                  <ImageWithLoading
                    src={product.featured_photo_url}
                    alt={product.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {(isOutOfStock || isLowStock) && (
                <div className="absolute -top-1 -right-1">
                  <Badge
                    variant="secondary"
                    className={`${getStockColor()} bg-white text-xs px-1`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </Badge>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base line-clamp-1">
                      {product.name}
                    </h3>
                    <Badge className={getStatusColor(product.status)}>
                      {formatStatus(product.status)}
                    </Badge>
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category.name}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Sales: ₱{product.total_sales.toLocaleString()}</span>
                    <span>Orders: {product.total_orders}</span>
                    <span className="font-medium text-foreground">
                      {priceDisplay}
                    </span>
                    <span className={`font-medium ${getStockColor()}`}>
                      Stock: {totalStock}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailsModalOpen(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStockModalOpen(true)}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Stock</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDetailsModalOpen(true)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Product
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStockModalOpen(true)}>
                        <Package className="w-4 h-4 mr-2" />
                        Manage Stock
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ProductDetailsModal
        product={product}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
      <StockManagementDialog
        product={product}
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
      />
    </>
  );
}
