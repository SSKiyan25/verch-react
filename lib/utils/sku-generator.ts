/**
 * Utility for generating SKUs (Stock Keeping Units)
 */

export interface SkuGenerationOptions {
  productName: string;
  variationName: string;
  variationIndex: number;
  existingSkus?: string[];
  prefix?: string;
  maxLength?: number;
}

/**
 * Generates a clean, URL-safe slug from text
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens and underscores
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Creates an acronym from text by taking first letter of each meaningful word
 */
function createAcronym(text: string, maxLength: number = 8): string {
  if (!text || text.trim().length === 0) {
    return "";
  }

  // Split into words and filter out common stop words
  const stopWords = [
    "new",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
  ];

  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .filter((word) => !stopWords.includes(word.toLowerCase()));

  if (words.length === 0) return "";

  // For single word, take first few characters
  if (words.length === 1) {
    return words[0].substring(0, Math.min(maxLength, 6)).toUpperCase();
  }

  // For multiple words, create smart acronym
  let acronym = "";

  for (const word of words) {
    // For numbers or very short words, take the whole thing
    if (/^\d+$/.test(word) || word.length <= 2) {
      acronym += word.toUpperCase();
    } else {
      // For longer words, take first letter
      acronym += word.charAt(0).toUpperCase();
    }

    // Stop if we've reached max length
    if (acronym.length >= maxLength) break;
  }

  return acronym.substring(0, maxLength);
}

/**
 * Extracts key words from text (now more permissive)
 */
function extractKeywords(text: string, maxWords: number = 2): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
  ];

  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word)) // Changed from > 2 to > 1
    .slice(0, maxWords);

  return words;
}

/**
 * Processes variation name to extract meaningful parts
 */
function processVariationName(variationName: string): string[] {
  // Common attribute patterns to extract
  const sizePattern =
    /\b(xs|sm?|md?|lg?|xl{1,3}|small|medium|large|extra|xxs|xxxl|\d+(?:in|inch|cm|mm)?)\b/gi;
  const colorPattern =
    /\b(red|blue|green|yellow|black|white|gray|grey|pink|purple|orange|brown|navy|maroon|cyan|magenta|silver|gold|beige|tan|cream|ivory)\b/gi;
  const numberPattern = /\b\d+\b/g;

  const parts: string[] = [];

  // Extract colors
  const colors = variationName.match(colorPattern);
  if (colors) {
    parts.push(colors[0].toLowerCase());
  }

  // Extract sizes
  const sizes = variationName.match(sizePattern);
  if (sizes) {
    parts.push(sizes[0].toLowerCase());
  }

  // Extract numbers (like shoe sizes, storage capacity, etc.)
  const numbers = variationName.match(numberPattern);
  if (numbers && !sizes) {
    parts.push(numbers[0]);
  }

  // If we didn't extract specific attributes, fall back to keywords
  if (parts.length === 0) {
    const keywords = extractKeywords(variationName, 2);
    parts.push(...keywords);
  }

  // If still nothing, create acronym
  if (parts.length === 0) {
    const acronym = createAcronym(variationName, 4);
    if (acronym) {
      parts.push(acronym.toLowerCase());
    }
  }

  return parts;
}

/**
 * Generates a SKU based on product and variation information
 */
export function generateSku(options: SkuGenerationOptions): string {
  const {
    productName,
    variationName,
    variationIndex,
    existingSkus = [],
    prefix = "",
    maxLength = 50,
  } = options;

  // Build SKU components
  const components: string[] = [];

  // Add prefix if provided
  if (prefix) {
    components.push(createSlug(prefix));
  }

  // Process product name
  const productKeywords = extractKeywords(productName, 1);

  if (productKeywords.length > 0 && productKeywords[0].length >= 4) {
    // Only use keyword if it's meaningful (4+ characters)
    components.push(productKeywords[0]);
  } else {
    // Create acronym from product name (this is preferred for most cases)
    const productAcronym = createAcronym(productName, 8);
    if (productAcronym && productAcronym.length >= 2) {
      components.push(productAcronym.toLowerCase());
    } else {
      components.push("prod");
    }
  }

  // Process variation name with smarter extraction
  const variationParts = processVariationName(variationName);

  if (variationParts.length > 0) {
    components.push(...variationParts.slice(0, 2)); // Max 2 parts from variation
  } else {
    // Ultimate fallback
    const fallback = createSlug(variationName).substring(0, 6);
    if (fallback) {
      components.push(fallback);
    } else {
      components.push("var");
    }
  }

  // Add variation number
  components.push(`v${variationIndex + 1}`);

  // Join components and ensure it's within length limit
  let baseSku = components
    .filter(Boolean) // Remove empty components
    .join("-")
    .toUpperCase();

  // Truncate if too long, but preserve the variation number
  if (baseSku.length > maxLength) {
    const versionPart = `-V${variationIndex + 1}`;
    const maxBaseLength = maxLength - versionPart.length;
    baseSku = baseSku.substring(0, maxBaseLength) + versionPart;
  }

  // Handle duplicates
  let finalSku = baseSku;
  let counter = 1;

  while (existingSkus.includes(finalSku)) {
    const suffix = `-${counter}`;
    if (baseSku.length + suffix.length <= maxLength) {
      finalSku = baseSku + suffix;
    } else {
      // Truncate base SKU to make room for counter
      const truncatedBase = baseSku.substring(0, maxLength - suffix.length);
      finalSku = truncatedBase + suffix;
    }
    counter++;
  }

  return finalSku;
}

/**
 * Validates if a SKU follows good practices
 */
export function validateSku(sku: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!sku || sku.trim().length === 0) {
    issues.push("SKU cannot be empty");
  }

  if (sku.length < 3) {
    issues.push("SKU should be at least 3 characters long");
  }

  if (sku.length > 50) {
    issues.push("SKU should not exceed 50 characters");
  }

  if (!/^[A-Z0-9_-]+$/i.test(sku)) {
    issues.push(
      "SKU should only contain letters, numbers, hyphens, and underscores"
    );
  }

  if (/^-|-$/.test(sku)) {
    issues.push("SKU cannot start or end with a hyphen");
  }

  if (/--/.test(sku)) {
    issues.push("SKU cannot contain consecutive hyphens");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Suggests alternative SKUs based on a base SKU
 */
export function suggestSkuAlternatives(
  baseSku: string,
  existingSkus: string[],
  count: number = 3
): string[] {
  const suggestions: string[] = [];
  const cleanBase = createSlug(baseSku).toUpperCase();

  for (let i = 1; i <= count + 10; i++) {
    const suggestion = `${cleanBase}-${i}`;
    if (!existingSkus.includes(suggestion)) {
      suggestions.push(suggestion);
      if (suggestions.length >= count) break;
    }
  }

  return suggestions;
}

/**
 * Examples of good SKU patterns for reference
 */
export const SKU_EXAMPLES = [
  "CNDFT-RED-L-V1", // CS3 New Dry Fit T-Shirt → CS3 New Dry Fit T-shirt
  "SNKR-BLUE-42-V1", // Product acronym + color + size
  "IPHONE15P-128GB-V1", // iPhone 15 Pro + capacity
  "RUNSHOES-BLACK-V1", // Running Shoes + color
  "WJACKET-XL-NAVY-V1", // Winter Jacket + size + color
];
