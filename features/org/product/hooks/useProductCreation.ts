import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProductData } from "@/lib/types/product";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";

export function useProductCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const orgId = user?.organization_id;

  const createProduct = async (productData: CreateProductData) => {
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

        // Show error toast
        toast.error("Failed to create product", {
          description: errorData.error || "An unexpected error occurred",
        });

        throw new Error(errorData.message || "Failed to create product");
      }

      const result = await response.json();
      console.log("Product created successfully:", result);

      // Show success toast
      toast.success("Product created successfully!", {
        description: `${productData.name} has been added to your products.`,
      });

      // Navigate to products page
      router.push(`/org/products`);

      return result;
    } catch (error) {
      console.error("Creation error:", error);

      // Show error toast if not already shown
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
