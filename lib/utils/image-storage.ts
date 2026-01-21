import { SupabaseClient } from "@supabase/supabase-js";

export interface MoveImageOptions {
  preserveOriginalName?: boolean;
  addTimestamp?: boolean;
  customPrefix?: string;
  targetBucket?: string;
}

export async function moveImageToPermanent(
  supabase: SupabaseClient,
  tempPath: string,
  finalPath: string,
  options: MoveImageOptions = {}
): Promise<string> {
  const { addTimestamp = true, targetBucket = "product-images" } = options;

  try {
    // Download from temp storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("temp-uploads")
      .download(tempPath);

    if (downloadError) {
      throw new Error(`Failed to download temp file: ${downloadError.message}`);
    }

    // Modify final path if timestamp should be added
    let actualFinalPath = finalPath;
    if (addTimestamp) {
      const timestamp = Date.now();
      const pathParts = finalPath.split(".");
      const extension = pathParts.pop();
      const basePath = pathParts.join(".");
      actualFinalPath = `${basePath}_${timestamp}.${extension}`;
    }

    // Upload to target bucket
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(actualFinalPath, fileData, {
        contentType: fileData.type || "image/*",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Failed to upload to ${targetBucket}: ${uploadError.message}`
      );
    }

    // Delete from temp storage
    await supabase.storage.from("temp-uploads").remove([tempPath]);

    // Get public URL from target bucket
    const {
      data: { publicUrl },
    } = supabase.storage.from(targetBucket).getPublicUrl(actualFinalPath);

    return publicUrl;
  } catch (error) {
    console.error("Error in moveImageToPermanent:", error);
    throw error;
  }
}

export async function moveMultipleImagesToPermanent(
  supabase: SupabaseClient,
  tempPaths: string[],
  destinationFolder: string,
  userId: string,
  entityId: string,
  prefix: string = "image"
): Promise<string[]> {
  const movePromises = tempPaths.map(async (tempPath, index) => {
    const timestamp = Date.now();
    const fileExtension = tempPath.split(".").pop();
    const finalPath = `${userId}/${destinationFolder}/${entityId}/${prefix}_${index}_${timestamp}.${fileExtension}`;

    return await moveImageToPermanent(supabase, tempPath, finalPath, {
      targetBucket: "product-images",
    });
  });

  return await Promise.all(movePromises);
}

export async function cleanupTempFiles(
  supabase: SupabaseClient,
  tempPaths: string[]
): Promise<void> {
  if (tempPaths.length === 0) return;

  try {
    const { error } = await supabase.storage
      .from("temp-uploads")
      .remove(tempPaths);

    if (error) {
      console.error("Error cleaning up temp files:", error);
    }
  } catch (error) {
    console.error("Error during temp file cleanup:", error);
  }
}

export async function cleanupPermanentImages(
  supabase: SupabaseClient,
  imageUrls: string[]
): Promise<void> {
  if (imageUrls.length === 0) return;

  try {
    const paths = imageUrls.map((url) => {
      const urlParts = url.split("/");
      const pathStartIndex = urlParts.findIndex(
        (part) => part === "product-images"
      );
      if (pathStartIndex !== -1 && pathStartIndex < urlParts.length - 1) {
        return urlParts.slice(pathStartIndex + 1).join("/");
      }
      return url;
    });

    const { error } = await supabase.storage
      .from("product-images")
      .remove(paths);

    if (error) {
      console.error("Error cleaning up permanent images:", error);
    }
  } catch (error) {
    console.error("Error during permanent image cleanup:", error);
  }
}

export function generatePermanentPath(
  userId: string,
  entityType: string,
  entityId: string,
  fileType: string,
  fileExtension: string,
  includeTimestamp: boolean = true
): string {
  const timestamp = includeTimestamp ? `_${Date.now()}` : "";
  return `${userId}/${entityType}/${entityId}/${fileType}${timestamp}.${fileExtension}`;
}

export function extractFileExtension(path: string): string {
  const extension = path.split(".").pop();
  if (!extension) {
    throw new Error(`Invalid file path: no extension found in ${path}`);
  }
  return extension;
}

export async function performImageMoveTransaction(
  supabase: SupabaseClient,
  operations: Array<{
    tempPath: string;
    finalPath: string;
  }>
): Promise<string[]> {
  const movedUrls: string[] = [];
  const tempPaths = operations.map((op) => op.tempPath);

  try {
    for (const operation of operations) {
      const url = await moveImageToPermanent(
        supabase,
        operation.tempPath,
        operation.finalPath,
        { targetBucket: "product-images" }
      );
      movedUrls.push(url);
    }

    return movedUrls;
  } catch (error) {
    if (movedUrls.length > 0) {
      await cleanupPermanentImages(supabase, movedUrls);
    }
    await cleanupTempFiles(supabase, tempPaths);
    throw error;
  }
}
