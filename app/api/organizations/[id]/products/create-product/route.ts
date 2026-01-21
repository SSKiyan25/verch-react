/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { Product } from "@/lib/types/product";
import { z } from "zod";
import {
  cleanupTempFiles,
  moveImageToPermanent,
  moveMultipleImagesToPermanent,
  extractFileExtension,
} from "@/lib/utils/image-storage";
// Import the fixed helper
import { createVariationInternal } from "@/lib/services/product-service";

// --- Validation Schema (Same as before) ---
const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().max(10000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["draft", "published", "archived", "pending_approval"])
    .default("draft"),
  search_keywords: z.array(z.string().max(50)).max(10).optional(),
  temp_featured_image_path: z.string().optional().nullable(),
  temp_gallery_image_paths: z.array(z.string()).optional(),
  can_pre_order: z.boolean().default(false),
  discount_type: z.enum(["none", "percentage", "fixed_amount"]).default("none"),
  discount_target: z.string().max(50).optional().nullable(),
  discount_value: z.number().min(0).max(999999.99).default(0),
  variations: z
    .array(
      z.object({
        sku: z.string().optional().nullable(),
        attributes: z.record(z.string(), z.any()).optional(),
        variation_name: z.string().optional().nullable(),
        price: z.number().min(0),
        compare_at_price: z.number().min(0).optional().nullable(),
        stock_quantity: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const tempFilesToCleanup: string[] = [];

  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user || !user.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = user.organization_id;

    // 1. Validate Input
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Track temp files
    if (validatedData.temp_featured_image_path)
      tempFilesToCleanup.push(validatedData.temp_featured_image_path);
    if (validatedData.temp_gallery_image_paths)
      tempFilesToCleanup.push(...validatedData.temp_gallery_image_paths);

    // 2. Insert Product (Initial)
    const initialProductData: Omit<
      Product,
      "id" | "created_at" | "updated_at" | "total_sales" | "total_orders"
    > = {
      account_id: user.id,
      organization_id: organizationId,
      name: validatedData.name.trim(),
      description: validatedData.description?.trim() || null,
      category_id: validatedData.category_id || null,
      status: validatedData.status,
      search_keywords: validatedData.search_keywords || [],
      featured_photo_url: null, // Placeholder
      photo_urls: [], // Placeholder
      can_pre_order: validatedData.can_pre_order,
      discount_type: validatedData.discount_type,
      discount_target: validatedData.discount_target || null,
      discount_value: validatedData.discount_value,
      is_approved: validatedData.status === "published",
      is_discounted:
        validatedData.discount_type !== "none" &&
        validatedData.discount_value > 0,
      is_archived: false,
      category_old: null,
    };

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert(initialProductData)
      .select("*")
      .single();

    if (insertError) {
      await cleanupTempFiles(supabase, tempFilesToCleanup);
      throw insertError;
    }

    // 3. Handle Images (Move Logic)
    let finalFeaturedUrl: string | null = null;
    let finalGalleryUrls: string[] = [];

    // Move Featured Image
    if (validatedData.temp_featured_image_path) {
      try {
        const ext = extractFileExtension(
          validatedData.temp_featured_image_path
        );
        const finalPath = `${organizationId}/products/${product.id}/featured.${ext}`;
        console.log("Moving featured image to:", finalPath);
        finalFeaturedUrl = await moveImageToPermanent(
          supabase,
          validatedData.temp_featured_image_path,
          finalPath,
          { targetBucket: "product-images" }
        );
      } catch (err) {
        console.error("Featured image move failed", err);
      }
    }

    // Move Gallery Images
    if (
      validatedData.temp_gallery_image_paths &&
      validatedData.temp_gallery_image_paths.length > 0
    ) {
      try {
        finalGalleryUrls = await moveMultipleImagesToPermanent(
          supabase,
          validatedData.temp_gallery_image_paths,
          "products",
          organizationId,
          product.id,
          "gallery"
        );
      } catch (err) {
        console.error("Gallery images move failed", err);
      }
    }

    // Update Product with Final URLs
    if (finalFeaturedUrl || finalGalleryUrls.length > 0) {
      console.log("Updating product with final image URLs...");
      await supabase
        .from("products")
        .update({
          featured_photo_url: finalFeaturedUrl,
          photo_urls: finalGalleryUrls,
        })
        .eq("id", product.id);
    }

    // 4. Handle Variations (Delegate to Helper)
    const variationsResult = {
      success: true,
      count: 0,
      errors: [] as string[],
    };

    if (validatedData.variations && validatedData.variations.length > 0) {
      console.log(
        `Processing ${validatedData.variations.length} variations...`
      );

      for (const variationData of validatedData.variations) {
        try {
          // ✅ WE CALL THE HELPER HERE
          // The helper now handles the "add" stock log correctly
          await createVariationInternal(
            supabase,
            user.id,
            organizationId,
            product.id,
            variationData
          );
          variationsResult.count++;
        } catch (error: any) {
          console.error("Variation creation failed:", error);
          variationsResult.success = false;
          variationsResult.errors.push(error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...product, featured_photo_url: finalFeaturedUrl },
      variations: variationsResult,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
