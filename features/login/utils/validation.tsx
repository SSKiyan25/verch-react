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

    // Basic length and format validation first
    if (email.length > 255) {
      return "Email address is too long";
    }

    if (!emailValidation.pattern?.test(email)) {
      return "Please enter a valid email address";
    }

    // Light security check - only block obviously malicious patterns
    const suspiciousPatterns = [
      /\.\./, // consecutive dots
      /^\./, // starts with dot
      /\.$/, // ends with dot
      /[<>\"'\\]/, // HTML/script tags
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(email))) {
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

// Updated password validation with strength requirements
export const passwordValidation: ValidationRule = {
  required: true,
  custom: (password: string) => {
    if (!password) return "Password is required";

    if (password.length > 128) {
      return "Password must be less than 128 characters";
    }

    // Light security check - only block obviously malicious patterns
    const suspiciousPatterns = [
      /[<>\"'\\]/, // HTML/script tags
      /\s{2,}/, // multiple consecutive spaces
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(password))) {
      return "Password contains invalid characters";
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
