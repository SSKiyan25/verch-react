/**
 * GCash Data Extraction Utility
 *
 * Extracts Reference Number and payment amount from GCash receipt OCR text.
 * This file replaces the original extractRefNo.ts to support extracting
 * multiple data points from GCash receipts.
 *
 * GCash Reference Number format:
 * - Exactly 13 consecutive digits
 * - May appear with spaces, dashes, or other separators in OCR text
 * - Example: "1234567890123" or "1234 5678 90123"
 *
 * GCash Amount format:
 * - PHP currency with ₱ symbol or without
 * - May appear as "₱99.00", "99.00", or "Total Amount Sent ₱99.00"
 * - Stored without currency symbol (numeric only)
 */

/**
 * Extract both Reference Number and amount from GCash receipt text
 *
 * @param rawText - Full text extracted by Vision API
 * @returns Object with refNo and amount (both nullable)
 *
 * @example
 * extractGCashData("Ref No. 1234567890123\nTotal Amount Sent ₱99.00")
 * // { refNo: "1234567890123", amount: 99.00 }
 */
export function extractGCashData(rawText: string): {
  refNo: string | null;
  amount: number | null;
} {
  return {
    refNo: extractRefNo(rawText),
    amount: extractAmount(rawText),
  };
}

/**
 * Extract 13-digit GCash Reference Number from raw OCR text
 *
 * @param rawText - Full text extracted by Vision API
 * @returns 13-digit Reference Number (digits only) or null if not found
 *
 * @example
 * extractRefNo("Reference No: 1234 5678 90123") // "1234567890123"
 * extractRefNo("Invalid text") // null
 */
export function extractRefNo(rawText: string): string | null {
  if (!rawText) {
    return null;
  }

  // Strategy 1: Look for 13 consecutive digits (no separators)
  const consecutiveMatch = rawText.match(/\b\d{13}\b/);
  if (consecutiveMatch) {
    return consecutiveMatch[0];
  }

  // Strategy 2: Look for sequences that might have separators
  // Find patterns like "1234 5678 90123" or "1234-5678-90123"
  // We'll look for sequences of 3+ digits separated by spaces/dashes
  const separatedPattern = /\b(\d{3,}[\s\-]*\d{3,}[\s\-]*\d{3,})\b/g;
  const candidates: string[] = [];

  let match;
  while ((match = separatedPattern.exec(rawText)) !== null) {
    candidates.push(match[1]);
  }

  // Test each candidate — strip non-digits and check if exactly 13 digits
  for (const candidate of candidates) {
    const digitsOnly = candidate.replace(/\D/g, "");

    if (digitsOnly.length === 13) {
      return digitsOnly;
    }
  }

  // Strategy 3: Look for any sequence of digits (even mixed with text)
  // Extract all digit sequences and check if any combination equals 13 digits
  const allDigits = rawText.replace(/\D/g, "");

  // Check if there's a 13-digit substring anywhere
  for (let i = 0; i <= allDigits.length - 13; i++) {
    const substring = allDigits.substring(i, i + 13);

    // Check if this 13-digit sequence is likely a Reference Number
    // (not just random digits — should have some context around it)
    const contextPattern = new RegExp(
      `\\b${substring.split("").join("[\\s\\-]*")}\\b`,
    );
    if (contextPattern.test(rawText)) {
      return substring;
    }
  }

  // No valid 13-digit Reference Number found
  return null;
}

/**
 * Extract payment amount from GCash receipt text
 *
 * Looks for patterns like:
 * - "Total Amount Sent ₱99.00"
 * - "Amount 99.00"
 * - "₱99.00"
 * - "99.00" (when near "amount" or "total" keywords)
 *
 * @param rawText - Full text extracted by Vision API
 * @returns Payment amount as number (without currency symbol) or null if not found
 *
 * @example
 * extractAmount("Total Amount Sent ₱99.00") // 99.00
 * extractAmount("Amount: 150.50") // 150.50
 * extractAmount("No amount here") // null
 */
export function extractAmount(rawText: string): number | null {
  if (!rawText) {
    return null;
  }

  // Strategy 1: Look for "Total Amount Sent" followed by currency amount
  // Matches: "Total Amount Sent ₱99.00", "Total Amount Sent 99.00"
  const totalAmountPattern =
    /total\s+amount\s+sent[:\s]*[₱\$]?\s*(\d+(?:[,\.]\d+)*)/i;
  const totalMatch = rawText.match(totalAmountPattern);
  if (totalMatch) {
    return parseAmount(totalMatch[1]);
  }

  // Strategy 2: Look for "Amount" label followed by currency amount
  // Matches: "Amount ₱99.00", "Amount: 99.00", "Amount 99.00"
  const amountLabelPattern = /\bamount[:\s]+[₱\$]?\s*(\d+(?:[,\.]\d+)*)/i;
  const amountMatch = rawText.match(amountLabelPattern);
  if (amountMatch) {
    return parseAmount(amountMatch[1]);
  }

  // Strategy 3: Look for currency symbol followed by amount
  // Matches: "₱99.00", "₱ 99.00", "PHP 99.00"
  const currencyAmountPattern = /[₱\$]|php\s*(\d+(?:[,\.]\d+)*)/gi;
  const currencyMatches = Array.from(rawText.matchAll(currencyAmountPattern));

  if (currencyMatches.length > 0) {
    // Take the largest amount found (most likely the total)
    const amounts = currencyMatches
      .map((match) => parseAmount(match[1]))
      .filter((amt): amt is number => amt !== null);

    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  // Strategy 4: Look for standalone large numbers (likely amounts)
  // Only consider if near amount-related keywords
  const amountKeywords = /amount|total|sent|paid|payment/i;
  if (amountKeywords.test(rawText)) {
    // Find all numbers that look like currency amounts (with decimals)
    const numberPattern = /\b(\d{1,6}(?:[,\.]\d{2})?)\b/g;
    const numberMatches = Array.from(rawText.matchAll(numberPattern));

    const amounts = numberMatches
      .map((match) => parseAmount(match[1]))
      .filter(
        (amt): amt is number => amt !== null && amt >= 1 && amt <= 100000,
      ); // Reasonable amount range

    if (amounts.length > 0) {
      // Return the most likely amount (largest with 2 decimal places)
      const amountsWithDecimals = amounts.filter((amt) => amt % 1 !== 0);
      if (amountsWithDecimals.length > 0) {
        return Math.max(...amountsWithDecimals);
      }
      return Math.max(...amounts);
    }
  }

  // No valid amount found
  return null;
}

/**
 * Parse amount string to number
 * Handles formats like "99.00", "1,234.56", "99,00" (European format)
 *
 * @param amountStr - Amount string to parse
 * @returns Parsed number or null if invalid
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) {
    return null;
  }

  // Remove any non-numeric characters except dots and commas
  let cleaned = amountStr.replace(/[^\d.,]/g, "");

  // Handle European format (comma as decimal separator)
  // If there's one comma and no dots, or comma is after dot, treat comma as decimal
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    // If both exist, assume dot is decimal (US format)
    cleaned = cleaned.replace(/,/g, "");
  } else {
    // Remove thousand separators
    cleaned = cleaned.replace(/,/g, "");
  }

  const parsed = parseFloat(cleaned);

  // Validate result is a reasonable amount
  if (isNaN(parsed) || parsed <= 0 || parsed > 1000000) {
    return null;
  }

  // Round to 2 decimal places
  return Math.round(parsed * 100) / 100;
}

/**
 * Validate Reference Number format
 *
 * @param refNo - Reference Number to validate
 * @returns true if valid 13-digit format, false otherwise
 */
export function isValidRefNoFormat(refNo: string | null): boolean {
  if (!refNo) {
    return false;
  }

  // Must be exactly 13 digits
  return /^\d{13}$/.test(refNo);
}
