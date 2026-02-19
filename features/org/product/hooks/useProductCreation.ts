import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProductData } from "@/lib/types/product";
import { toast } from "sonner";

// ⚡ Accepts orgId directly to avoid internal fetching
export function useProductCreation(orgId: string) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const createProduct = async (productData: CreateProductData) => {
    // Safety check
    if (!orgId) {
      toast.error("Organization ID is missing");
      return null;
    }

    setIsCreating(true);
    try {
      console.log("Service sending payload:", productData);

      const response = await fetch(
        `/api/organizations/${orgId}/products/create-product`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);

        toast.error("Failed to create product", {
          description: errorData.error || "An unexpected error occurred",
        });

        throw new Error(errorData.message || "Failed to create product");
      }

      const result = await response.json();
      console.log("Product created successfully:", result);

      toast.success("Product created successfully!", {
        description: `${productData.name} has been added to your products.`,
      });

      router.push(`/org/products`);

      return result;
    } catch (error) {
      console.error("Creation error:", error);

      if (
        !(
          error instanceof Error &&
          error.message.includes("Failed to create product")
        )
      ) {
        toast.error("Failed to create product", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }

      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createProduct, isCreating };
}
