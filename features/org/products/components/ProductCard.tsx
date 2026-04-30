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
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { getOrgProductPriceDisplay } from "@/lib/utils/price-formatting";

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
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "draft":
        return "bg-slate-50 text-slate-600 border border-slate-200";
      case "pending_approval":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "archived":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  const getStockColor = () => {
    if (isOutOfStock) return "text-rose-600";
    if (isLowStock) return "text-amber-600";
    return "text-emerald-600";
  };

  const formatStatus = (status: string) =>
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <>
      <Card className="group relative overflow-hidden bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col h-full cursor-pointer">
        {/* Image — fixed aspect ratio */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shrink-0 rounded-t-xl">
          {product.featured_photo_url ? (
            <ImageWithLoading
              src={product.featured_photo_url}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-300" />
            </div>
          )}

          {/* Overlay gradient for better badge visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge
              className={`${getStatusColor(product.status)} text-xs px-2.5 py-0.5 font-medium shadow-sm backdrop-blur-sm`}
            >
              {formatStatus(product.status)}
            </Badge>
          </div>

          {/* Stock warning */}
          {(isOutOfStock || isLowStock) && (
            <div className="absolute bottom-3 left-3">
              <Badge
                className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 gap-1 font-medium shadow-sm backdrop-blur-sm"
              >
                <AlertTriangle className="w-3 h-3" />
                {isOutOfStock ? "Out of Stock" : "Low Stock"}
              </Badge>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-9 h-9 bg-white/95 backdrop-blur-md hover:bg-white shadow-lg rounded-full border-0"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 shadow-xl border-slate-200">
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2 text-violet-600" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/org/products/${product.id}`)}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2 text-blue-600" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/org/products/${product.id}/stocks`)
                  }
                  className="cursor-pointer"
                >
                  <Package className="w-4 h-4 mr-2 text-amber-600" /> Manage Stock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content — flex-1 so it fills remaining card height */}
        <CardContent className="p-4 flex flex-col flex-1 gap-2">
          {/* Category — fixed min-height so cards without category don't collapse */}
          <div className="min-h-[18px]">
            {product.category_name && (
              <span className="text-[11px] text-violet-600 uppercase tracking-wider font-semibold">
                {product.category_name}
              </span>
            )}
          </div>

          {/* Name — fixed 2-line clamp keeps height consistent */}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug min-h-[42px]">
            {product.name}
          </h3>

          {/* Price */}
          <p className="text-base font-bold text-slate-900 mt-1">
            {getOrgProductPriceDisplay(product.min_price, product.max_price)}
          </p>

          {/* Stock + variants */}
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className={`font-semibold ${getStockColor()}`}>
              {isOutOfStock
                ? product.can_pre_order
                  ? "Pre-order"
                  : "Out of stock"
                : `${totalStock} in stock`}
            </span>
            <span className="text-slate-500 font-medium">
              {product.variation_count || 0} variant
              {(product.variation_count || 0) !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-auto pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-sm font-medium border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-colors duration-200 cursor-pointer"
              onClick={() => setDetailsModalOpen(true)}
            >
              <Settings className="w-4 h-4 mr-1.5" /> Actions
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
