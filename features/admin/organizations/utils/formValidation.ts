// Simple password validation for simulation
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
  strength: string;
} {
  const errors: string[] = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"],
      score: 0,
      strength: "weak",
    };
  }

  if (password.length >= 8) {
    score++;
  } else {
    errors.push("Password must be at least 8 characters long");
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    errors.push("Password must contain at least one number");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    score++;
  } else {
    errors.push("Password must contain at least one special character");
  }

  // Determine strength based on score
  let strength = "weak";
  if (score >= 4) strength = "strong";
  else if (score >= 3) strength = "good";
  else if (score >= 2) strength = "fair";

  return {
    isValid: errors.length === 0,
    errors,
    score,
    strength,
  };
}

// Simple field validation
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

export function validateRequired(
  value: string,
  fieldName: string
): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}
