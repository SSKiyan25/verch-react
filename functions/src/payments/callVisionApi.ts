/**
 * Google Cloud Vision API Wrapper
 *
 * Calls Google Cloud Vision API to perform text detection (OCR) on payment screenshots.
 * This is a pure function with no Supabase calls or side effects.
 *
 * Input: Firebase Storage download URL or image buffer
 * Output: Extracted text and confidence score
 *
 * Authentication: Uses Application Default Credentials (ADC) automatically
 * in Firebase Cloud Functions environment — no API key needed.
 */

import { ImageAnnotatorClient } from "@google-cloud/vision";
import type { VisionApiResult } from "./types";

/**
 * Call Google Cloud Vision API to extract text from an image
 *
 * @param imageUrl - Public download URL of the payment screenshot
 * @returns Extracted text and confidence score
 * @throws Error if Vision API call fails
 */
export async function callVisionApi(
  imageUrl: string,
): Promise<VisionApiResult> {
  try {
    // Initialize Vision API client
    // Uses Application Default Credentials automatically in Cloud Functions
    const client = new ImageAnnotatorClient();

    // Call text detection API
    const [result] = await client.textDetection(imageUrl);
    const detections = result.textAnnotations;

    // Extract full text from first annotation (contains all detected text)
    const rawText =
      detections && detections.length > 0
        ? detections[0].description || ""
        : "";

    // Extract confidence score
    // Vision API provides confidence at the page level
    let confidence: number | null = null;
    if (result.fullTextAnnotation?.pages?.[0]) {
      const page = result.fullTextAnnotation.pages[0];
      confidence = page.confidence ?? null;
    }

    return {
      rawText,
      confidence,
    };
  } catch (error) {
    // Log error details for debugging
    console.error("[callVisionApi] Vision API call failed:", error);

    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`Vision API failed: ${error.message}`);
    }
    throw new Error("Vision API failed with unknown error");
  }
}
