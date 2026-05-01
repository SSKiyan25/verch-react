import { useEffect, useState } from "react";

/**
 * Custom hook to debounce search input
 * @param value - The search value to debounce
 * @param delay - Delay in milliseconds (default: 400ms)
 * @returns Debounced search value
 */
export function useDebouncedSearch(value: string, delay: number = 400): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
