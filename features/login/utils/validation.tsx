import { validateInputSecurity } from "@/lib/utils/security";

// Define ValidationRule type and export it
export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  custom?: (value: string) => string | null;
}

// Type for validation errors
export type ValidationErrors = Record<string, string | null>;

// Helper function to validate a single field
export const validateField = (
  value: string,
  rule: ValidationRule
): string | null => {
  // Check if field is required and empty
  if (rule.required && (!value || value.trim() === "")) {
    return "This field is required";
  }

  // If field is empty and not required, it's valid
  if (!value || value.trim() === "") {
    return null;
  }

  // Check minimum length
  if (rule.minLength && value.length < rule.minLength) {
    return `Must be at least ${rule.minLength} characters long`;
  }

  // Check pattern
  if (rule.pattern && !rule.pattern.test(value)) {
    return "Invalid format";
  }

  // Run custom validation if provided
  if (rule.custom) {
    return rule.custom(value);
  }

  return null;
};

// Helper function to validate entire form
export const validateForm = (
  fields: Record<string, string>,
  rules: Record<string, ValidationRule>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((fieldName) => {
    const value = fields[fieldName] || "";
    const rule = rules[fieldName];
    errors[fieldName] = validateField(value, rule);
  });

  return errors;
};

// Updated email validation with security checks
export const emailValidation: ValidationRule = {
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  custom: (email: string) => {
    if (!email) return "Email is required";

    // Security validation first
    const securityCheck = validateInputSecurity(email, {
      fieldType: "email",
      maxLength: 255,
    });

    if (securityCheck.blocked) {
      return `Security violation: ${securityCheck.threats.join(", ")}`;
    }

    if (!emailValidation.pattern?.test(email)) {
      return "Please enter a valid email address";
    }

    // VSU/Organization email preference (optional warning)
    if (
      !email.includes(".edu") &&
      !email.includes("vsu") &&
      !email.includes("organization")
    ) {
      console.warn("Consider using an organizational email address");
    }

    return null;
  },
};

// Updated password validation with security checks
export const passwordValidation: ValidationRule = {
  required: true,
  minLength: 8,
  custom: (password: string) => {
    if (!password) return "Password is required";

    // Security validation
    const securityCheck = validateInputSecurity(password, {
      maxLength: 128,
    });

    if (securityCheck.blocked) {
      return `Security violation: ${securityCheck.threats.join(", ")}`;
    }

    return null;
  },
};

// Login validation rules object
export const loginValidationRules = {
  email: emailValidation,
  password: passwordValidation,
};

// Helper function to check if there are any validation errors
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some(
    (error) => error !== null && error !== undefined && error !== ""
  );
};
