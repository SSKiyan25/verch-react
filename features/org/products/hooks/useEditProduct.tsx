/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { UpdateProductInput } from "@/lib/types/org-products";
import { validateInputSecurity } from "@/lib/utils/security"; // Adjust path as needed
import { updateProductAction } from "@/features/org/products/actions/productActions";

interface UseEditProductProps {
  onSuccess?: (updatedProduct: ProductWithDetails) => void;
  onError?: (error: Error) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function useEditProduct({
  onSuccess,
  onError,
}: UseEditProductProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 1. Unified Validation Logic
  // This combines your specific business rules (length, etc.) with your generic Security Utils
  const validateUpdateData = useCallback(
    (data: Partial<UpdateProductInput>): ValidationResult => {
      const errors: Record<string, string> = {};

      // Helper to quickly check security for any string field
      const checkSecurity = (field: string, value: any) => {
        if (typeof value === "string") {
          const secResult = validateInputSecurity(value);
          if (!secResult.isValid || secResult.blocked) {
            errors[field] = secResult.threats[0] || "Invalid content detected.";
            return false;
          }
        }
        return true;
      };

      // --- Specific Business Logic Checks ---

      // Name
      if (data.name !== undefined) {
        if (!data.name.trim()) {
          errors.name = "Product name is required";
        } else if (data.name.trim().length < 3) {
          errors.name = "Product name must be at least 3 characters";
        } else {
          checkSecurity("name", data.name);
        }
      }

      // Description
      if (data.description !== undefined && data.description !== null) {
        // Only enforce length if it's not empty string (optional field)
        if (data.description.length > 0 && data.description.length < 10) {
          errors.description = "Description must be at least 10 characters";
        }
        checkSecurity("description", data.description);
      }

      // Keywords (Array check)
      if (data.search_keywords !== undefined) {
        if (data.search_keywords.length > 10) {
          errors.search_keywords = "Maximum 10 keywords allowed";
        }
        // Check individual keywords for security
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        data.search_keywords.forEach((keyword, index) => {
          if (typeof keyword === "string") {
            const secResult = validateInputSecurity(keyword);
            if (!secResult.isValid) {
              errors.search_keywords = `Keyword "${keyword}" contains invalid characters`;
            }
          }
        });
      }

      // Price / Discount Logic
      if (
        data.discount_value !== undefined &&
        data.discount_value !== null &&
        data.discount_value < 0
      ) {
        errors.discount_value = "Discount value cannot be negative";
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    },
    [],
  );

  // 2. The Update Function
  const updateProduct = useCallback(
    async (
      organizationId: string,
      productId: string,
      updateData: Partial<UpdateProductInput>,
    ) => {
      setIsLoading(true);
      setGlobalError(null);
      setFieldErrors({});

      try {
        // A. Validate Frontend Side First
        const validation = validateUpdateData(updateData);
        if (!validation.isValid) {
          setFieldErrors(validation.errors);
          throw new Error("Please check the form for errors");
        }

        // console.log("Data to be sent to API:", updateData);

        // B. API Call - Use Server Action
        const result = await updateProductAction(
          organizationId,
          productId,
          updateData,
        );

        if (!result.success) {
          console.error(
            "[updateProductAction] Server returned error:",
            result.error,
          );
          throw new Error(result.error || "Failed to update product");
        }

        // C. Success - Call onSuccess with fresh data
        // Note: We don't call router.refresh() here because it creates race conditions
        // with client-side refetches. Let the parent component handle cache refresh.
        if (onSuccess && result.data) {
          // Cast OrgProductDetail to ProductWithDetails for callback compatibility
          onSuccess(result.data as any);
        }

        return result.data;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Unknown error");
        setGlobalError(errorObj.message);

        if (onError) {
          onError(errorObj);
        }
        // We re-throw so the UI component can also catch it if using await
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError, validateUpdateData],
  );

  const clearErrors = useCallback(() => {
    setGlobalError(null);
    setFieldErrors({});
  }, []);

  return {
    updateProduct,
    isLoading,
    globalError,
    fieldErrors,
    clearErrors,
    validateUpdateData,
  };
}
