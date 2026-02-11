/**
 * Logging Sanitization Utility
 * Prevents sensitive data from being logged
 */

/**
 * Patterns for sensitive data that should never be logged
 */
const SENSITIVE_PATTERNS = [
  /Bearer\s+[\w-]+/gi,
  /authorization:\s*[\w-]+/gi,
  /accessToken|refreshToken|token\s*[:=]\s*["']?[\w-]+["']?/gi,
  /client_secret|clientSecret|CLIENT_SECRET\s*[:=]\s*["']?[\w-]+["']?/gi,
  /api_key|apiKey|API_KEY\s*[:=]\s*["']?[\w-]+["']?/gi,
  /password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  /refresh_token|refreshToken\s*[:=]\s*["']?[\w-]+["']?/gi,
  /encryption_key|encryptionKey|ENCRYPTION_KEY\s*[:=]\s*["']?[\w-]+["']?/gi,
];

/**
 * Sanitize a string to remove sensitive data
 * @param text The text to sanitize
 * @returns Sanitized text with sensitive data redacted
 */
export function sanitizeLog(text: string | any): string | any {
  if (typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      const prefix = match.split(/[:=]/)[0] || 'SECRET';
      return `${prefix}=***REDACTED***`;
    });
  }

  return sanitized;
}

/**
 * Sanitize an object, recursively cleaning sensitive fields
 * @param obj The object to sanitize
 * @returns New object with sensitive data redacted
 */
export function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeLog(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  const sensitiveKeys = [
    'accessToken', 'access_token',
    'refreshToken', 'refresh_token',
    'clientSecret', 'client_secret',
    'apiKey', 'api_key',
    'password',
    'encryptionKey', 'encryption_key',
    'token', 'Authorization', 'authorization',
    'secret',
  ];

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeLog(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Wrapped console.log that sanitizes logs
 */
export const secureConsole = {
  log: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeObject(arg));
    console.log(...sanitized);
  },

  error: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeObject(arg));
    console.error(...sanitized);
  },

  warn: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeObject(arg));
    console.warn(...sanitized);
  },

  info: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeObject(arg));
    console.info(...sanitized);
  },

  debug: (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeObject(arg));
    console.debug(...sanitized);
  },
};

/**
 * Get sanitized request details for logging
 */
export function getSanitizedRequestInfo(req: any) {
  return {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    // Don't log auth header directly, just that it exists
    hasAuth: !!req.headers['authorization'],
  };
}

/**
 * Logging middleware for sanitized request logging
 */
export function secureLoggingMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  // Log request
  const requestInfo = getSanitizedRequestInfo(req);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, requestInfo);

  // Log response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };

  next();
}

export default {
  sanitizeLog,
  sanitizeObject,
  secureConsole,
  getSanitizedRequestInfo,
  secureLoggingMiddleware,
};
