"use server";

import { createClient } from "@/lib/supabase/server";
import {
  moveImageToPermanent,
  moveMultipleImagesToPermanent,
  extractFileExtension,
} from "@/lib/utils/image-storage";
import type { ActionResult } from "@/lib/types/org-products";

const ALLOWED_ROLES = ["organization_admin", "organization_manager"];

type MoveProductImagesResult = {
  featured_photo_url: string | null;
  photo_urls: string[];
};

// =============================================================================
// moveProductImagesAction
// Moves product images from temp storage to permanent storage before creation.
// This must be called server-side because it requires downloading from one
// bucket and uploading to another.
// =============================================================================

export async function moveProductImagesAction(
  orgId: string,
  tempFeaturedPath: string | null,
  tempGalleryPaths: string[],
): Promise<ActionResult<MoveProductImagesResult>> {
  try {
    // 1. Create client
    const supabase = await createClient();

    // 2. Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Role gate — fetch from DB
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userData) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      userData.organization_id !== orgId ||
      !ALLOWED_ROLES.includes(userData.role ?? "")
    ) {
      return { success: false, error: "Forbidden" };
    }

    // 4. Move featured image from temp to permanent
    let featured_photo_url: string | null = null;
    if (tempFeaturedPath) {
      try {
        // Generate unique path for featured image
        // We'll use a timestamp since we don't have the product ID yet
        const ext = extractFileExtension(tempFeaturedPath);
        const timestamp = Date.now();
        const finalPath = `${orgId}/products/temp_${timestamp}/featured.${ext}`;

        featured_photo_url = await moveImageToPermanent(
          supabase,
          tempFeaturedPath,
          finalPath,
          { targetBucket: "product-images" },
        );
      } catch (err) {
        console.error("Featured image move failed:", err);
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to move featured image",
        };
      }
    }

    // 5. Move gallery images from temp to permanent
    let photo_urls: string[] = [];
    if (tempGalleryPaths && tempGalleryPaths.length > 0) {
      try {
        // Use timestamp-based path since we don't have product ID yet
        const timestamp = Date.now();
        photo_urls = await moveMultipleImagesToPermanent(
          supabase,
          tempGalleryPaths,
          "products",
          orgId,
          `temp_${timestamp}`,
          "gallery",
        );
      } catch (err) {
        console.error("Gallery images move failed:", err);
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to move gallery images",
        };
      }
    }

    // 6. Return the permanent URLs
    return {
      success: true,
      data: {
        featured_photo_url,
        photo_urls,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
