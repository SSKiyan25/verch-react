/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductVariation } from "@/lib/types/product";

/**
 * Safely formats a variation display name with proper fallbacks
 */
export function getVariationDisplayName(
  variation: ProductVariation | any
): string {
  // First check for variation_name
  if (variation.variation_name) {
    // console.log("Using variation_name:", variation.variation_name);
    return variation.variation_name;
  }

  // Then check for attributes
  if (variation.attributes && typeof variation.attributes === "object") {
    const attributeValues = Object.values(variation.attributes).filter(Boolean);
    if (attributeValues.length > 0) {
      return attributeValues.join(", ");
    }
  }

  // Fallback to SKU or default text
  return variation.sku || "Standard Variation";
}

/**
 * Gets the stock status color class
 */
export function getStockStatusColor(availableQuantity: number): string {
  if (availableQuantity === 0) return "text-red-600";
  if (availableQuantity < 10) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Gets the product status color classes
 */
export function getProductStatusColor(status: string): string {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    case "pending_approval":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "archived":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

/**
 * Calculates total stock across all variations
 */
export function getTotalStock(
  variations: ProductVariation[] | undefined
): number {
  return (
    variations?.reduce(
      (total, variation) => total + variation.available_quantity,
      0
    ) || 0
  );
}

/**
 * Checks if product has low stock
 */
export function isLowStock(availableQuantity: number): boolean {
  return availableQuantity < 10 && availableQuantity > 0;
}

/**
 * Checks if product is out of stock
 */
export function isOutOfStock(availableQuantity: number): boolean {
  return availableQuantity === 0;
}
