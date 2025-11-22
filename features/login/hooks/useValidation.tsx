import { useState, useCallback } from "react";
import {
  ValidationErrors,
  ValidationRule,
  validateField,
  validateForm,
} from "../utils/validation";

interface UseValidationProps {
  rules: Record<string, ValidationRule>;
  validateOnChange?: boolean;
}

export function useValidation({
  rules,
  validateOnChange = false,
}: UseValidationProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateSingleField = useCallback(
    (fieldName: string, value: string) => {
      const rule = rules[fieldName];
      if (!rule) return null;

      const error = validateField(value, rule);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
      return error;
    },
    [rules]
  );

  const validateAllFields = useCallback(
    (fields: Record<string, string>) => {
      const validationErrors = validateForm(fields, rules);
      setErrors(validationErrors);
      return validationErrors;
    },
    [rules]
  );

  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const markFieldAsTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      if (validateOnChange || touched[fieldName]) {
        validateSingleField(fieldName, value);
      }
    },
    [validateOnChange, touched, validateSingleField]
  );

  const handleFieldBlur = useCallback(
    (fieldName: string, value: string) => {
      markFieldAsTouched(fieldName);
      validateSingleField(fieldName, value);
    },
    [markFieldAsTouched, validateSingleField]
  );

  const isValid = Object.values(errors).every((error) => error === null);
  const hasErrors = Object.values(errors).some((error) => error !== null);

  return {
    errors,
    touched,
    isValid,
    hasErrors,
    validateSingleField,
    validateAllFields,
    clearError,
    clearAllErrors,
    handleFieldChange,
    handleFieldBlur,
    markFieldAsTouched,
  };
}
