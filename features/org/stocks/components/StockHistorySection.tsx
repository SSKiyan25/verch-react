"use client";

import { useState } from "react";
import { ProductWithDetails, StockLog } from "@/lib/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { getVariationDisplayName } from "@/lib/utils/product-utils";
import { useStockHistory } from "../hooks/useStockHistory";
import { StockLogDetailsDialog } from "./StockLogDetailsDialog";

interface StockHistorySectionProps {
  product: ProductWithDetails;
  organizationId: string;
}

export function StockHistorySection({
  product,
  organizationId,
}: StockHistorySectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [variationFilter, setVariationFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { logs, pagination, isLoading, error } = useStockHistory({
    organizationId,
    productId: product.id,
    page: currentPage,
    limit: pageSize,
    action: actionFilter,
    variationId: variationFilter,
    search: searchTerm,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    // Actions that increase stock: add, adjustment (when positive), released
    const isIncrease = ["add", "adjust", "released"].includes(action);
    return isIncrease ? (
      <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600" />
    );
  };

  const getQuantityChangeColor = (change: number) => {
    return change > 0 ? "text-green-600" : "text-red-600";
  };

  const getSourceTypeColor = (sourceType: string | null) => {
    if (!sourceType) return "bg-gray-100 text-gray-800";

    switch (sourceType) {
      case "variation_creation":
        return "bg-blue-100 text-blue-800";
      case "ARCHIVE_ACTION":
        return "bg-orange-100 text-orange-800";
      case "RESTORE_ACTION":
        return "bg-green-100 text-green-800";
      case "API_USER":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVariationName = (variationId: string) => {
    const variation = product.variations?.find((v) => v.id === variationId);
    return variation ? getVariationDisplayName(variation) : variationId;
  };

  const handleLogClick = (log: StockLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">
            Stock Activity History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-3 md:px-6">
          {/* Filters */}
          <div className="space-y-2 md:space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={variationFilter}
                onValueChange={setVariationFilter}
              >
                <SelectTrigger className="h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Variation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Variations</SelectItem>
                  {product.variations?.map((variation) => (
                    <SelectItem key={variation.id} value={variation.id}>
                      {getVariationDisplayName(variation)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs md:text-sm col-span-2 md:col-span-1 md:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Show 10</SelectItem>
                  <SelectItem value="25">Show 25</SelectItem>
                  <SelectItem value="50">Show 50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-red-600">
              <p>Failed to load stock history</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stock history found</p>
            </div>
          )}

          {/* History List */}
          {!isLoading && !error && logs.length > 0 && (
            <div className="space-y-2 md:space-y-3">
              {logs.map((log) => (
                <Card
                  key={log.id}
                  className="p-3 md:p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleLogClick(log)}
                >
                  <div className="space-y-2 md:space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
                        {getActionIcon(log.action)}
                        <span className="text-xs md:text-sm font-medium capitalize truncate">
                          {log.action}
                        </span>
                        {log.source_type && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] md:text-xs shrink-0 ${getSourceTypeColor(
                              log.source_type
                            )}`}
                          >
                            {log.source_type.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                        <span
                          className={`font-bold text-xs md:text-sm ${getQuantityChangeColor(
                            log.quantity_change
                          )}`}
                        >
                          {log.quantity_change > 0 ? "+" : ""}
                          {log.quantity_change}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Stock:
                        </span>
                        <div className="font-medium">
                          {log.previous_quantity ?? 0} → {log.new_quantity ?? 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Date:
                        </span>
                        <div className="font-medium text-xs md:text-sm">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Variation Info */}
                    <div className="text-xs md:text-sm">
                      <span className="text-muted-foreground">Variation:</span>
                      <span className="ml-1 font-medium truncate">
                        {getVariationName(log.variation_id)}
                      </span>
                    </div>

                    {/* Remarks */}
                    {log.remarks && (
                      <div className="text-xs md:text-sm text-muted-foreground bg-muted/30 p-2 rounded line-clamp-2">
                        {log.remarks}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 pt-3 md:pt-4">
              <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                <span className="hidden sm:inline">Showing </span>
                {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                <span className="hidden sm:inline"> of {pagination.total}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 text-xs"
                >
                  Prev
                </Button>

                <span className="text-xs md:text-sm font-medium min-w-[60px] text-center">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1)
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <StockLogDetailsDialog
        log={selectedLog}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={product}
      />
    </>
  );
}
