/**
 * GCash Reference Number Extraction Utility
 *
 * Extracts and validates GCash 13-digit Reference Number from OCR text.
 * Pure function — no API calls, no database queries, no side effects.
 *
 * GCash Reference Number format:
 * - Exactly 13 consecutive digits
 * - May appear with spaces, dashes, or other separators in OCR text
 * - Example: "1234567890123" or "1234 5678 90123"
 *
 * Strategy:
 * 1. Find all sequences that could be Reference Numbers
 * 2. Strip non-digit characters
 * 3. Validate exactly 13 digits
 * 4. Return first valid match or null
 */

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
