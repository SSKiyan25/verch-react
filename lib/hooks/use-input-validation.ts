/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/,
  price: /^\d+(\.\d{1,2})?$/,
  sku: /^[A-Z0-9\-_]+$/i,
} as const;

// Input sanitization
export const sanitizeInput = {
  text: (value: string): string => {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/[<>]/g, "");
  },

  number: (value: string): number => {
    const num = parseFloat(value.replace(/[^\d.-]/g, ""));
    return isNaN(num) ? 0 : num;
  },

  price: (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
  },

  sku: (value: string): string => {
    return value.replace(/[^a-zA-Z0-9\-_]/g, "").toUpperCase();
  },

  keyword: (value: string): string => {
    return value.replace(/[<>]/g, "").trim();
  },
};

interface UseInputValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitizer?: (value: string) => string | number;
  customValidator?: (value: any) => string | null;
}

export function useInputValidation(options: UseInputValidationOptions = {}) {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (value: any): boolean => {
      // Clear previous error
      setError(null);

      // Sanitize if sanitizer provided
      if (options.sanitizer && typeof value === "string") {
        value = options.sanitizer(value);
      }

      // Required validation
      if (options.required) {
        if (
          !value ||
          (typeof value === "string" && !value.trim()) ||
          value === 0
        ) {
          setError("This field is required");
          return false;
        }
      }

      // Skip other validations if empty and not required
      if (!value || (typeof value === "string" && !value.trim())) {
        return true;
      }

      // String validations
      if (typeof value === "string") {
        if (options.minLength && value.length < options.minLength) {
          setError(`Minimum ${options.minLength} characters required`);
          return false;
        }

        if (options.maxLength && value.length > options.maxLength) {
          setError(`Maximum ${options.maxLength} characters allowed`);
          return false;
        }

        if (options.pattern && !options.pattern.test(value)) {
          setError("Invalid format");
          return false;
        }
      }

      // Custom validation
      if (options.customValidator) {
        const customError = options.customValidator(value);
        if (customError) {
          setError(customError);
          return false;
        }
      }

      return true;
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    validate,
    clearError,
    isValid: !error,
  };
}
