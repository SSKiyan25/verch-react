import { useState, useEffect } from "react";
import { ProductWithDetails } from "@/lib/types/product";

interface UseProductOptions {
  organizationId?: string;
  productId?: string;
  enabled?: boolean;
}

interface UseProductReturn {
  product: ProductWithDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProduct({
  organizationId,
  productId,
  enabled = true,
}: UseProductOptions): UseProductReturn {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = async () => {
    if (!organizationId || !productId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch product");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setProduct(data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch product");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, productId, enabled]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}
