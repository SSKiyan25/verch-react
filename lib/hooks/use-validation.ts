/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string | null;
}

export function useValidation<T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, ValidationRule>
) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      const rule = rules[name];
      if (!rule) return null;

      // Required validation
      if (
        rule.required &&
        (!value || (typeof value === "string" && !value.trim()))
      ) {
        return `${String(name)} is required`;
      }

      // Skip other validations if value is empty and not required
      if (!value || (typeof value === "string" && !value.trim())) {
        return null;
      }

      // String validations
      if (typeof value === "string") {
        if (rule.minLength && value.length < rule.minLength) {
          return `Minimum ${rule.minLength} characters required`;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          return `Maximum ${rule.maxLength} characters allowed`;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return "Invalid format";
        }
      }

      // Number validations
      if (typeof value === "number") {
        if (rule.min !== undefined && value < rule.min) {
          return `Minimum value is ${rule.min}`;
        }
        if (rule.max !== undefined && value > rule.max) {
          return `Maximum value is ${rule.max}`;
        }
      }

      // Array validations (for arrays like keywords)
      if (Array.isArray(value)) {
        if (rule.minLength && value.length < rule.minLength) {
          return `At least ${rule.minLength} items required`;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          return `Maximum ${rule.maxLength} items allowed`;
        }
      }

      // Custom validation
      if (rule.custom) {
        return rule.custom(value);
      }

      return null;
    },
    [rules]
  );

  const validateAll = useCallback(
    (data: T): boolean => {
      const newErrors: ValidationErrors = {};
      let hasErrors = false;

      Object.keys(rules).forEach((key) => {
        const error = validateField(key as keyof T, data[key]);
        if (error) {
          newErrors[key] = error;
          hasErrors = true;
        }
      });

      setErrors(newErrors);
      return !hasErrors;
    },
    [rules, validateField]
  );

  const validateSingle = useCallback(
    (name: keyof T, value: any): boolean => {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name as string]: error }));
      return !error;
    },
    [validateField]
  );

  const clearError = useCallback((name: keyof T) => {
    setErrors((prev) => ({ ...prev, [name as string]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateAll,
    validateSingle,
    validateField,
    clearError,
    clearAllErrors,
    hasErrors: Object.values(errors).some((error) => error !== null),
  };
}
