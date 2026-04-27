/**
 * Safely parses variation attributes that may come as a JSON string
 * (from the database) or an already-parsed object.
 */
export function parseAttributes(attrs: unknown): Record<string, string> {
  if (!attrs) return {};
  if (typeof attrs === "string") {
    try {
      const parsed = JSON.parse(attrs);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof attrs === "object" && attrs !== null) {
    return attrs as Record<string, string>;
  }
  return {};
}

/**
 * Returns attribute entries excluding the "Variant" key.
 */
export function getCustomAttributes(attrs: unknown): [string, string][] {
  return Object.entries(parseAttributes(attrs)).filter(
    ([k]) => k !== "Variant",
  );
}

/**
 * Returns all attribute entries.
 */
export function getAllAttributes(attrs: unknown): [string, string][] {
  return Object.entries(parseAttributes(attrs));
}
