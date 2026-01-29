"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
// import { StockManagementDialog } from "./stock/StockManagementDialog";
import { EditProductModal } from "./edit/EditProductModal";

interface ProductCardProps {
  product: ProductWithDetails;
  onProductUpdate: (product: ProductWithDetails) => void; // Added Prop
}

export function ProductCard({ product, onProductUpdate }: ProductCardProps) {
  const router = useRouter();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  // const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false); // Added State

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
        return "bg-emerald-500 text-white";
      case "draft":
        return "bg-slate-400 text-white";
      case "pending_approval":
        return "bg-amber-500 text-white";
      case "archived":
        return "bg-red-500 text-white";
      default:
        return "bg-slate-400 text-white";
    }
  };

  const getStockColor = () => {
    if (isOutOfStock) return "text-red-500";
    if (isLowStock) return "text-amber-500";
    return "text-emerald-500";
  };

  // Helper function to format status text
  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleManageStock = () => {
    router.push(`/org/products/${product.id}/stocks`);
  };

  return (
    <>
      <Card className="group relative overflow-hidden bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-lg">
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          {product.featured_photo_url ? (
            <ImageWithLoading
              src={product.featured_photo_url}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-400" />
            </div>
          )}

          {/* Floating Actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleManageStock}>
                  <Package className="w-4 h-4 mr-2" />
                  Manage Stock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge
              className={`${getStatusColor(
                product.status
              )} text-xs font-medium border-0`}
            >
              {formatStatus(product.status)}
            </Badge>
          </div>

          {/* Stock Warning */}
          {(isOutOfStock || isLowStock) && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {isOutOfStock ? "Out of Stock" : "Low Stock"}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4 space-y-3">
          {/* Category */}
          {product.category && (
            <Badge variant="outline" className="text-xs text-slate-600">
              {product.category.name}
            </Badge>
          )}

          {/* Product Name */}
          <h3 className="font-semibold text-slate-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {product.description || "No description available"}
          </p>

          {/* Price */}
          <div className="pt-2">
            <span className="text-xl font-bold text-slate-900">
              {priceDisplay}
            </span>
          </div>

          {/* Stock Info */}
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${getStockColor()}`}>
              Stock: {totalStock}
            </span>
            <span className="text-slate-500">
              {product.variations?.length || 0} variant
              {product.variations?.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Sales Info */}
          <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-100">
            <span>₱{product.total_sales.toLocaleString()} sales</span>
            <span>{product.total_orders} orders</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setDetailsModalOpen(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleManageStock}
            >
              <Package className="w-4 h-4 mr-1" />
              Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ProductDetailsModal
        product={product}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        onProductUpdate={onProductUpdate}
      />

      <EditProductModal
        product={product}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={onProductUpdate}
      />

      {/* Removed StockManagementDialog - now navigates to dedicated page */}
    </>
  );
}
