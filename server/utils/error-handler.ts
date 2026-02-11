/**
 * Safe Error Handler
 * Prevents information disclosure by mapping internal errors to safe user messages
 * All error details are logged internally for debugging
 */

import { Response } from 'express';
import { secureConsole } from './logging-sanitizer';

/**
 * Error categories for safe response mapping
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PERMISSION = 'PERMISSION_DENIED',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Safe error response structure
 */
export interface SafeErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Internal error details (logged only, never sent to client)
 */
interface ErrorContext {
  originalError: Error | unknown;
  category: ErrorCategory;
  statusCode: number;
  internalMessage: string;
  context?: Record<string, any>;
}

/**
 * User-safe error messages (no internal details)
 */
const SAFE_ERROR_MESSAGES: Record<ErrorCategory, { message: string; statusCode: number }> = {
  [ErrorCategory.VALIDATION]: {
    message: 'Invalid input provided',
    statusCode: 400,
  },
  [ErrorCategory.AUTHENTICATION]: {
    message: 'Authentication failed. Please try again or contact support.',
    statusCode: 401,
  },
  [ErrorCategory.NOT_FOUND]: {
    message: 'The requested resource was not found',
    statusCode: 404,
  },
  [ErrorCategory.CONFLICT]: {
    message: 'This resource already exists',
    statusCode: 409,
  },
  [ErrorCategory.PERMISSION]: {
    message: 'You do not have permission to perform this action',
    statusCode: 403,
  },
  [ErrorCategory.INTERNAL]: {
    message: 'An unexpected error occurred. Please try again later.',
    statusCode: 500,
  },
};

/**
 * Send a safe error response to the client
 * Logs full error details internally
 */
export function sendSafeError(
  res: Response,
  category: ErrorCategory,
  internalError: Error | unknown,
  context?: Record<string, any>
): void {
  const config = SAFE_ERROR_MESSAGES[category];

  // Log internal details for debugging (using sanitized console)
  const errorMsg = internalError instanceof Error ? internalError.message : String(internalError);
  const errorStack = internalError instanceof Error ? internalError.stack : undefined;

  secureConsole.error(`[ERROR-${category}] ${errorMsg}`, {
    stack: errorStack,
    context,
  });

  // Send safe response to client
  res.status(config.statusCode).json({
    success: false,
    error: config.message,
    code: category,
  } as SafeErrorResponse);
}

/**
 * Send validation error with safe details
 */
export function sendValidationError(
  res: Response,
  internalError: Error | unknown,
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.VALIDATION, internalError, context);
}

/**
 * Send authentication error
 */
export function sendAuthenticationError(
  res: Response,
  internalError: Error | unknown,
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.AUTHENTICATION, internalError, context);
}

/**
 * Send not found error
 */
export function sendNotFoundError(
  res: Response,
  internalError: Error | unknown = 'Resource not found',
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.NOT_FOUND, internalError, context);
}

/**
 * Send conflict error (resource already exists)
 */
export function sendConflictError(
  res: Response,
  internalError: Error | unknown,
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.CONFLICT, internalError, context);
}

/**
 * Send permission denied error
 */
export function sendPermissionError(
  res: Response,
  internalError: Error | unknown = 'Permission denied',
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.PERMISSION, internalError, context);
}

/**
 * Send internal server error
 */
export function sendInternalError(
  res: Response,
  internalError: Error | unknown,
  context?: Record<string, any>
): void {
  sendSafeError(res, ErrorCategory.INTERNAL, internalError, context);
}

/**
 * Safe wrapper for async route handlers
 * Automatically catches errors and sends safe responses
 */
export function asyncHandler(
  fn: (req: any, res: any) => Promise<void>
): (req: any, res: any) => Promise<void> {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (error) {
      sendInternalError(res, error, {
        route: req.route?.path,
        method: req.method,
      });
    }
  };
}

/**
 * Extract safe error code from error (for OAuth-specific errors)
 */
export function getSafeErrorCode(error: any): string {
  if (error?.code && typeof error.code === 'string' && error.code.length < 50) {
    return error.code;
  }
  return ErrorCategory.INTERNAL;
}
