"use client";

import { useState } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

interface ProductCardProps {
  product: ProductWithDetails;
}

export function ProductCard({ product }: ProductCardProps) {
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
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-square">
          {product.featured_photo_url && (
            <ImageWithLoading
              src={product.featured_photo_url}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
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
          <div className="absolute top-2 left-2 space-y-1">
            <Badge className={getStatusColor(product.status)}>
              {formatStatus(product.status)}
            </Badge>
            {(isOutOfStock || isLowStock) && (
              <div className="flex">
                <Badge
                  variant="secondary"
                  className={`${getStockColor()} bg-white/90`}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {isOutOfStock ? "Out of Stock" : "Low Stock"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{priceDisplay}</span>
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${getStockColor()}`}>
                Stock: {totalStock}
              </span>
              <span className="text-muted-foreground">
                {product.variations?.length || 0} variant
                {product.variations?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sales: ₱{product.total_sales.toLocaleString()}</span>
              <span>Orders: {product.total_orders}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setDetailsModalOpen(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setStockModalOpen(true)}
              >
                <Package className="w-4 h-4 mr-2" />
                Stock
              </Button>
            </div>
          </div>
        </CardFooter>
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
