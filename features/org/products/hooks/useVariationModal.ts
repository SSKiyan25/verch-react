import { useState } from "react";
import { ProductVariation } from "@/lib/types/product";
import { VariationFormData } from "../components/modals/VariationModal";

interface UseVariationModalProps {
  productId: string;
  organizationId: string;
  onVariationUpdate?: (variation: ProductVariation) => void;
  onVariationCreate?: (variation: ProductVariation) => void;
  onVariationDelete?: (variationId: string) => void;
}

export function useVariationModal({
  productId,
  organizationId,
  onVariationUpdate,
  onVariationCreate,
  onVariationDelete,
}: UseVariationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVariation, setEditingVariation] =
    useState<ProductVariation | null>(null);

  const openCreateModal = () => {
    setEditingVariation(null);
    setIsOpen(true);
  };

  const openEditModal = (variation: ProductVariation) => {
    setEditingVariation(variation);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingVariation(null);
  };

  const handleSave = async (formData: VariationFormData) => {
    // 1. Guard Clause: Ensure we have IDs before making requests
    if (!productId || !organizationId) {
      console.error("Missing IDs", { productId, organizationId });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Payload Sanitization:
      // Ensure numbers are strictly numbers and empty strings become null
      // This prevents "Internal Server Errors" caused by database type mismatches
      const payload = {
        sku: formData.sku && formData.sku.trim() !== "" ? formData.sku : null,
        variation_name: formData.variation_name,
        // Force conversion to Number to handle any string remnants
        price: Number(formData.price),
        compare_at_price: formData.compare_at_price
          ? Number(formData.compare_at_price)
          : null,
        stock_quantity: Number(formData.stock_quantity),
        pre_order_quantity: Number(formData.pre_order_quantity || 0),
        attributes: formData.attributes || {},
        is_available: formData.is_available,
      };

      // Debug: Log what we are actually sending
      console.log("Saving Variation Payload:", payload);
      console.log("ProductID", productId, "OrganizationID", organizationId);

      if (editingVariation) {
        // --- UPDATE ---
        const response = await fetch(
          `/api/organizations/${organizationId}/products/${productId}/variations/${editingVariation.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update variation");
        }

        onVariationUpdate?.(result.data);
      } else {
        // --- CREATE ---
        const response = await fetch(
          `/api/organizations/${organizationId}/products/${productId}/variations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create variation");
        }

        onVariationCreate?.(result.data);
      }

      closeModal();
    } catch (error) {
      console.error("Save variation error:", error);

      // Handle specific server-side errors if the message is known
      if (error instanceof Error) {
        if (error.message.includes("Validation error")) {
          console.error("Please check your input and try again");
        } else if (
          error.message.toLowerCase().includes("unique") ||
          error.message.toLowerCase().includes("sku")
        ) {
          console.error("This SKU is already in use.");
        } else {
          console.error(error.message);
        }
      } else {
        console.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (variationId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}/variations/${variationId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to archive variation");
      }

      console.log(result.message || "Variation archived successfully");
      onVariationDelete?.(variationId);
    } catch (error) {
      console.error("Delete variation error:", error);
      console.error(
        error instanceof Error ? error.message : "Failed to archive variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (variationId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/products/${productId}/variations/${variationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_archived: false,
            // is_available: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to restore variation");
      }

      console.log("Variation restored successfully");

      // Update the UI
      if (onVariationUpdate) {
        onVariationUpdate(result.data);
      }
    } catch (error) {
      console.error("Restore variation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    isLoading,
    editingVariation,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    handleRestore,
  };
}
