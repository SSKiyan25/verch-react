import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProductData } from "@/lib/types/product";
import { toast } from "sonner";
import { createProductAction } from "@/features/org/products/actions/productActions";
import { moveProductImagesAction } from "@/features/org/products/actions/imageActions";
import type { CreateProductInput } from "@/features/org/products/schemas/productSchemas";

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
      // Step 1: Move images from temp to permanent storage
      let featured_photo_url: string | null = null;
      let photo_urls: string[] = [];

      if (
        productData.temp_featured_image_path ||
        (productData.temp_gallery_image_paths &&
          productData.temp_gallery_image_paths.length > 0)
      ) {
        const moveResult = await moveProductImagesAction(
          orgId,
          productData.temp_featured_image_path ?? null,
          productData.temp_gallery_image_paths ?? [],
        );

        if (!moveResult.success || !moveResult.data) {
          toast.error("Failed to process images", {
            description: !moveResult.success
              ? moveResult.error
              : "Unknown error",
          });
          return null;
        }

        featured_photo_url = moveResult.data.featured_photo_url;
        photo_urls = moveResult.data.photo_urls;
      }

      // Step 2: Map CreateProductData to CreateProductInput
      const input: CreateProductInput = {
        name: productData.name,
        description: productData.description || null,
        category_id: productData.category_id || null,
        supplier_id: undefined,
        search_keywords: productData.search_keywords || [],
        can_pre_order: productData.can_pre_order || false,
        featured_photo_url,
        photo_urls,
        variations:
          productData.variations?.map((v) => ({
            price: v.price,
            variation_name: v.variation_name || null,
            sku: v.sku || null,
            attributes: v.attributes || {},
            compare_at_price: v.compare_at_price || null,
            stock_quantity: v.stock_quantity || 0,
            is_available: true,
          })) || [],
      };

      // Step 3: Create product via Server Action
      const result = await createProductAction(orgId, input);

      if (!result.success) {
        toast.error("Failed to create product", {
          description: result.error,
        });
        return null;
      }

      toast.success("Product created successfully!", {
        description: `${productData.name} has been added to your products.`,
      });

      router.push(`/org/products`);

      return result.data;
    } catch (error) {
      console.error("Creation error:", error);
      toast.error("Failed to create product", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createProduct, isCreating };
}
