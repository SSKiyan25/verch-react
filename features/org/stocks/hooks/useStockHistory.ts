import { useState, useEffect } from "react";
import { getStockLogsAction } from "@/features/org/products/actions/stockActions";
import type { StockLogEntry } from "@/lib/types/org-products";

interface UseStockHistoryOptions {
  organizationId: string;
  productId: string;
  page?: number;
  limit?: number;
  action?: string;
  variationId?: string;
  search?: string;
}

interface StockHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useStockHistory({
  organizationId,
  productId,
  page = 1,
  limit = 10,
  action = "all",
  variationId = "all",
  search = "",
}: UseStockHistoryOptions) {
  const [data, setData] = useState<StockLogEntry[]>([]);
  const [pagination, setPagination] = useState<StockHistoryPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use server action instead of API route
        const result = await getStockLogsAction(
          organizationId,
          productId,
          variationId === "all" ? null : variationId,
          page,
          limit,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch stock history");
        }

        // TypeScript now knows result.data exists after success check
        const logs = result.data?.logs ?? [];
        const totalCount = result.data?.totalCount ?? 0;

        // Map the result to match expected format
        setData(logs);
        setPagination({
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [organizationId, productId, page, limit, action, variationId, search]);

  return {
    logs: data,
    pagination,
    isLoading,
    error,
  };
}
