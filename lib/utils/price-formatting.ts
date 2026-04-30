// =============================================================================
// lib/utils/price-formatting.ts
// Price formatting utilities for product displays
// =============================================================================

/**
 * Format a price amount in Philippine Peso
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get price display for org products (admin view)
 * Returns formatted price range or single price based on min/max
 */
export function getOrgProductPriceDisplay(
  minPrice: number | null,
  maxPrice: number | null,
): string {
  // No price data available
  if (minPrice == null || maxPrice == null) {
    return "Contact for price";
  }

  // Single price point
  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }

  // Price range
  return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
}
