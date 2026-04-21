// Common malicious patterns
const MALICIOUS_PATTERNS = {
  // SQL Injection patterns
  SQL_INJECTION: [
    // Looks for a quote immediately followed by a SQL command (e.g., ' OR, ' SELECT)
    /'(\s*(union|select|insert|update|delete|drop|create|alter|exec|execute|declare|cast|convert|script)\s*)/gi,

    // Removed the standalone \b(select|update|etc)\b check because it blocks normal English words.

    // Removed standard quotes (' and ") and asterisks (*) from this list.
    // Kept comment blocks and system procedures.
    /(;|--|\/\*|\*\/|xp_|sp_)/gi,

    // Looks for classic 'or injection
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
  ],

  // XSS patterns
  XSS: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>[\s\S]*?<\/embed>/gi,
    /<applet[\s\S]*?>[\s\S]*?<\/applet>/gi,
    /<meta[\s\S]*?>/gi,
    /<link[\s\S]*?>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ],

  // Command Injection patterns
  COMMAND_INJECTION: [
    // FIXED: Removed the extra pipe that was matching empty strings!
    /(\||\$\(|\`|<|>)/g,

    // ADDED \b (word boundaries) so it only matches exact words, not parts of words (like 'should')
    /(\b(wget|curl|nc|netcat|bash|sh|cmd|powershell|python|perl|ruby|php)\b)/gi,

    // This one is mostly fine, but keep an eye on it if users write paths
    /(\.\.|\/etc\/|\/bin\/|\/usr\/|\/var\/|\/tmp\/|\/home\/)/gi,
  ],

  // Path Traversal patterns
  PATH_TRAVERSAL: [
    /(\.\.[\/\\]){1,}/g,
    /(\.\.%2f|\.\.%5c|\.\.\/|\.\.\\)/gi,
    /(%2e%2e%2f|%2e%2e%5c|%2e%2e\/|%2e%2e\\)/gi,
  ],

  // LDAP Injection patterns
  LDAP_INJECTION: [
    /(\*|\(|\)|\||\&|!|=|<|>|~)/g,
    /(\%2a|\%28|\%29|\%7c|\%26|\%21|\%3d|\%3c|\%3e|\%7e)/gi,
  ],

  // NoSQL Injection patterns
  NOSQL_INJECTION: [
    /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex|\$where|\$exists)/gi,
    // Removed the comma (\,) and colon (\:) to allow normal punctuation
    /(\{|\}|\[|\])/g,
  ],

  // Template Injection patterns
  TEMPLATE_INJECTION: [/(\{\{|\}\}|\{%|%\}|\{#|#\})/g, /(\$\{|\})/g],

  // Common malicious file extensions
  MALICIOUS_EXTENSIONS: [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|ps1|sh|py|php|asp|aspx|jsp|pl|rb)$/gi,
  ],

  // Suspicious URLs
  SUSPICIOUS_URLS: [
    /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/gi,
    /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/gi,
  ],
};

// Security severity levels
export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Security check result interface
export interface SecurityCheckResult {
  isValid: boolean;
  severity: SecuritySeverity;
  threats: string[];
  sanitizedValue?: string;
  blocked: boolean;
}

// Individual pattern checkers
export const securityCheckers = {
  checkSQLInjection: (input: string): boolean => {
    return MALICIOUS_PATTERNS.SQL_INJECTION.some((pattern) =>
      pattern.test(input),
    );
  },

  checkXSS: (input: string): boolean => {
    return MALICIOUS_PATTERNS.XSS.some((pattern) => pattern.test(input));
  },

  checkCommandInjection: (input: string): boolean => {
    return MALICIOUS_PATTERNS.COMMAND_INJECTION.some((pattern) =>
      pattern.test(input),
    );
  },

  checkPathTraversal: (input: string): boolean => {
    return MALICIOUS_PATTERNS.PATH_TRAVERSAL.some((pattern) =>
      pattern.test(input),
    );
  },

  checkLDAPInjection: (input: string): boolean => {
    return MALICIOUS_PATTERNS.LDAP_INJECTION.some((pattern) =>
      pattern.test(input),
    );
  },

  checkNoSQLInjection: (input: string): boolean => {
    return MALICIOUS_PATTERNS.NOSQL_INJECTION.some((pattern) =>
      pattern.test(input),
    );
  },

  checkTemplateInjection: (input: string): boolean => {
    return MALICIOUS_PATTERNS.TEMPLATE_INJECTION.some((pattern) =>
      pattern.test(input),
    );
  },

  checkMaliciousExtensions: (filename: string): boolean => {
    return MALICIOUS_PATTERNS.MALICIOUS_EXTENSIONS.some((pattern) =>
      pattern.test(filename),
    );
  },

  checkSuspiciousURLs: (input: string): boolean => {
    return MALICIOUS_PATTERNS.SUSPICIOUS_URLS.some((pattern) =>
      pattern.test(input),
    );
  },
};

// Main security validation function
export const validateInputSecurity = (
  input: string,
  options: {
    allowHTML?: boolean;
    allowURLs?: boolean;
    maxLength?: number;
    fieldType?: "email" | "name" | "description" | "filename" | "general";
  } = {},
): SecurityCheckResult => {
  const threats: string[] = [];
  let severity = SecuritySeverity.LOW;
  let blocked = false;

  // Basic input validation
  if (!input || typeof input !== "string") {
    return {
      isValid: true,
      severity: SecuritySeverity.LOW,
      threats: [],
      blocked: false,
    };
  }

  // Length check
  if (options.maxLength && input.length > options.maxLength) {
    threats.push("Input exceeds maximum allowed length");
    severity = SecuritySeverity.MEDIUM;
  }

  // SQL Injection check
  if (securityCheckers.checkSQLInjection(input)) {
    threats.push("Potential SQL injection detected");
    severity = SecuritySeverity.CRITICAL;
    blocked = true;
  }

  // XSS check
  if (!options.allowHTML && securityCheckers.checkXSS(input)) {
    threats.push("Potential XSS attack detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // Command Injection check
  if (securityCheckers.checkCommandInjection(input)) {
    threats.push("Potential command injection detected");
    severity = SecuritySeverity.CRITICAL;
    blocked = true;
  }

  // Path Traversal check
  if (securityCheckers.checkPathTraversal(input)) {
    threats.push("Potential path traversal attack detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // LDAP Injection check
  if (securityCheckers.checkLDAPInjection(input)) {
    threats.push("Potential LDAP injection detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // NoSQL Injection check
  if (securityCheckers.checkNoSQLInjection(input)) {
    threats.push("Potential NoSQL injection detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // Template Injection check
  if (securityCheckers.checkTemplateInjection(input)) {
    threats.push("Potential template injection detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // URL check
  if (!options.allowURLs && securityCheckers.checkSuspiciousURLs(input)) {
    threats.push("Suspicious URL detected");
    severity = SecuritySeverity.MEDIUM;
  }

  // File extension check (for filename fields)
  if (
    options.fieldType === "filename" &&
    securityCheckers.checkMaliciousExtensions(input)
  ) {
    threats.push("Malicious file extension detected");
    severity = SecuritySeverity.HIGH;
    blocked = true;
  }

  // Additional checks based on field type
  if (options.fieldType === "email") {
    // Email-specific security checks
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input)) {
      threats.push("Invalid email format");
      severity = SecuritySeverity.MEDIUM;
    }
  }

  return {
    isValid: threats.length === 0,
    severity,
    threats,
    sanitizedValue: sanitizeInput(input, options),
    blocked,
  };
};

// Input sanitization function
export const sanitizeInput = (
  input: string,
  options: {
    allowHTML?: boolean;
    allowURLs?: boolean;
    maxLength?: number;
  } = {},
): string => {
  if (!input || typeof input !== "string") return "";

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Truncate if too long
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove HTML if not allowed
  if (!options.allowHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }

  // Remove suspicious characters
  sanitized = sanitized.replace(/[<>'"&]/g, (match) => {
    const htmlEntities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "&": "&amp;",
    };
    return htmlEntities[match] || match;
  });

  return sanitized;
};

// Rate limiting utilities
export const rateLimitingUtils = {
  // Simple in-memory rate limiting (for development)
  attempts: new Map<string, { count: number; lastAttempt: number }>(),

  checkRateLimit: (
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 300000,
  ): boolean => {
    const now = Date.now();
    const attemptData = rateLimitingUtils.attempts.get(identifier);

    if (!attemptData) {
      rateLimitingUtils.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }

    // Reset if outside window
    if (now - attemptData.lastAttempt > windowMs) {
      rateLimitingUtils.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
      });
      return true;
    }

    // Check if exceeded limit
    if (attemptData.count >= maxAttempts) {
      return false;
    }

    // Increment counter
    attemptData.count++;
    attemptData.lastAttempt = now;
    return true;
  },

  clearRateLimit: (identifier: string): void => {
    rateLimitingUtils.attempts.delete(identifier);
  },
};

// Logging utility for security events
export const logSecurityEvent = (
  event: string,
  details: {
    input?: string;
    threats?: string[];
    severity?: SecuritySeverity;
    userAgent?: string;
    ip?: string;
    timestamp?: Date;
  },
): void => {
  const logEntry = {
    event,
    ...details,
    timestamp: details.timestamp || new Date(),
  };

  // In production, send to your logging service
  console.warn("🚨 Security Event:", logEntry);

  // You can integrate with services like:
  // - Sentry
  // - LogRocket
  // - Custom logging API
  // - Supabase Edge Functions for logging
};

// Export commonly used patterns for custom validation
export { MALICIOUS_PATTERNS };
