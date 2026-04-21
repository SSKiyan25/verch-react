"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrgProductListItem } from "@/lib/types/org-products";
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

interface ProductCardProps {
  product: OrgProductListItem;
  orgId: string;
}

export function ProductCard({ product, orgId }: ProductCardProps) {
  const router = useRouter();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const totalStock = product.total_stock;
  const isLowStock = totalStock < 10 && totalStock > 0;
  const isOutOfStock = totalStock === 0 && !product.can_pre_order;

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
    return "text-emerald-600";
  };

  const formatStatus = (status: string) =>
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <>
      {/* h-full so the card stretches to match siblings in the grid row */}
      <Card className="group relative overflow-hidden bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md flex flex-col h-full">
        {/* Image — fixed aspect ratio */}
        <div className="relative aspect-square overflow-hidden bg-slate-50 shrink-0">
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
              <Package className="w-8 h-8 text-slate-300" />
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <Badge
              className={`${getStatusColor(product.status)} text-[10px] px-1.5 py-0 border-0`}
            >
              {formatStatus(product.status)}
            </Badge>
          </div>

          {/* Stock warning */}
          {(isOutOfStock || isLowStock) && (
            <div className="absolute bottom-2 left-2">
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 gap-0.5"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                {isOutOfStock ? "Out of Stock" : "Low Stock"}
              </Badge>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-7 h-7 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/org/products/${product.id}`)}
                >
                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/org/products/${product.id}/stocks`)
                  }
                >
                  <Package className="w-3.5 h-3.5 mr-2" /> Manage Stock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content — flex-1 so it fills remaining card height */}
        <CardContent className="p-3 flex flex-col flex-1 gap-1.5">
          {/* Category — fixed min-height so cards without category don't collapse */}
          <div className="min-h-[16px]">
            {product.category_name && (
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                {product.category_name}
              </span>
            )}
          </div>

          {/* Name — fixed 2-line clamp keeps height consistent */}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug min-h-[40px]">
            {product.name}
          </h3>

          {/* Price */}
          <p className="text-sm font-bold text-slate-900">Contact for price</p>

          {/* Stock + variants */}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${getStockColor()}`}>
              {isOutOfStock
                ? product.can_pre_order
                  ? "Pre-order"
                  : "Out of stock"
                : `${totalStock} in stock`}
            </span>
            <span className="text-slate-400">
              {product.variation_count || 0} variant
              {(product.variation_count || 0) !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Orders - removed as not available in list data */}

          {/* Buttons */}
          <div className="flex gap-1.5 mt-auto flex-col md:flex-row pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 p-1 text-xs"
              onClick={() => setDetailsModalOpen(true)}
            >
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProductDetailsModal
        productId={product.id}
        orgId={orgId}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </>
  );
}
