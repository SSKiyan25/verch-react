import { useState, useEffect } from "react";
import { StockLog } from "@/lib/types/product";

interface UseStockHistoryOptions {
  organizationId: string;
  productId: string;
  page?: number;
  limit?: number;
  action?: string;
  variationId?: string;
  search?: string;
}

interface StockHistoryResponse {
  success: boolean;
  data: StockLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  const [data, setData] = useState<StockLog[]>([]);
  const [pagination, setPagination] = useState({
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
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (action !== "all") params.append("action", action);
        if (variationId !== "all") params.append("variationId", variationId);
        if (search) params.append("search", search);

        const response = await fetch(
          `/api/organizations/${organizationId}/products/${productId}/stock-history?${params}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch stock history");
        }

        const result: StockHistoryResponse = await response.json();

        if (result.success) {
          setData(result.data);
          setPagination(result.pagination);
        } else {
          throw new Error("Failed to fetch stock history");
        }
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
