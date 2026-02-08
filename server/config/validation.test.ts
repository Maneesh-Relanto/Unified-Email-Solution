import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Email Configuration & Validation', () => {
  describe('Provider Configuration', () => {
    const validateProviderConfig = (config: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!config.provider) errors.push('Provider is required');
      if (!['gmail', 'outlook', 'yahoo', 'imap'].includes(config.provider)) {
        errors.push(`Unknown provider: ${config.provider}`);
      }
      if (!config.email || !config.email.includes('@')) {
        errors.push('Valid email address required');
      }
      if (config.provider !== 'imap' && !config.clientId) {
        errors.push('OAuth providers require clientId');
      }
      if (config.provider === 'imap' && !config.password) {
        errors.push('IMAP requires password');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate Gmail OAuth config', () => {
      const config = {
        provider: 'gmail',
        email: 'user@gmail.com',
        clientId: 'client-id',
        clientSecret: 'secret',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Outlook OAuth config', () => {
      const config = {
        provider: 'outlook',
        email: 'user@outlook.com',
        clientId: 'client-id',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should validate IMAP config', () => {
      const config = {
        provider: 'imap',
        email: 'user@yahoo.com',
        password: 'secure_password',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject missing provider', () => {
      const config = { email: 'user@example.com' };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
    });

    it('should reject invalid email', () => {
      const config = {
        provider: 'gmail',
        email: 'invalid-email',
        clientId: 'id',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Valid email'))).toBe(true);
    });

    it('should reject OAuth without clientId', () => {
      const config = {
        provider: 'gmail',
        email: 'user@gmail.com',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('clientId'))).toBe(true);
    });

    it('should reject IMAP without password', () => {
      const config = {
        provider: 'imap',
        email: 'user@yahoo.com',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('password'))).toBe(true);
    });

    it('should reject unknown provider types', () => {
      const config = {
        provider: 'ProtonMail',
        email: 'user@proton.me',
      };

      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown provider'))).toBe(true);
    });
  });

  describe('OAuth State Validation', () => {
    const generateOAuthState = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let state = '';
      for (let i = 0; i < 32; i++) {
        state += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return state;
    };

    const isValidOAuthState = (state: string): boolean => {
      return /^[A-Za-z0-9]{32}$/.test(state);
    };

    it('should generate valid OAuth state', () => {
      const state = generateOAuthState();
      expect(isValidOAuthState(state)).toBe(true);
    });

    it('should validate correctly formatted state', () => {
      expect(isValidOAuthState('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456')).toBe(true);
    });

    it('should reject state with wrong length', () => {
      expect(isValidOAuthState('TOO_SHORT')).toBe(false);
      expect(isValidOAuthState('A'.repeat(33))).toBe(false);
    });

    it('should reject state with invalid characters', () => {
      expect(isValidOAuthState('ABCD1234' + '!@#$%^&*' + 'A'.repeat(16))).toBe(false);
      expect(isValidOAuthState('ABCD1234-EFGH5678-IJKL9012-MNOP3456')).toBe(false);
    });
  });

  describe('Pagination Validation', () => {
    const validatePaginationParams = (
      skip?: number,
      limit?: number,
    ): { valid: boolean; skip: number; limit: number } => {
      const normalizedSkip = Math.max(0, skip || 0);
      const normalizedLimit = Math.max(1, Math.min(limit || 20, 100));

      return {
        valid: normalizedSkip >= 0 && normalizedLimit > 0 && normalizedLimit <= 100,
        skip: normalizedSkip,
        limit: normalizedLimit,
      };
    };

    it('should accept valid pagination params', () => {
      const result = validatePaginationParams(10, 20);
      expect(result.valid).toBe(true);
      expect(result.skip).toBe(10);
      expect(result.limit).toBe(20);
    });

    it('should default to skip 0 and limit 20', () => {
      const result = validatePaginationParams();
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(20);
    });

    it('should clamp negative skip to 0', () => {
      const result = validatePaginationParams(-5, 10);
      expect(result.skip).toBe(0);
    });

    it('should clamp limit between 1 and 100', () => {
      const result1 = validatePaginationParams(0, 0);
      expect(result1.limit).toBeGreaterThanOrEqual(1);

      const result2 = validatePaginationParams(0, 500);
      expect(result2.limit).toBeLessThanOrEqual(100);
    });

    it('should handle decimal values', () => {
      const result = validatePaginationParams(10.5, 20.7);
      expect(result.skip).toBe(10.5);
      expect(result.limit).toBe(20.7);
    });
  });

  describe('Error Response Formatting', () => {
    const formatErrorResponse = (error: Error | string, statusCode: number = 500) => {
      const message = typeof error === 'string' ? error : error.message;
      const isDev = process.env.NODE_ENV === 'development';

      return {
        success: false,
        error: message,
        statusCode,
        ...(isDev && { stack: error instanceof Error ? error.stack : undefined }),
      };
    };

    it('should format Error object to response', () => {
      const error = new Error('Something went wrong');
      const response = formatErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
      expect(response.statusCode).toBe(500);
    });

    it('should format string error to response', () => {
      const response = formatErrorResponse('Invalid input', 400);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid input');
      expect(response.statusCode).toBe(400);
    });

    it('should include stack trace in development mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const response = formatErrorResponse(error);

      expect(response.stack).toBeDefined();
      expect(response.stack).toContain('Error: Test error');

      process.env.NODE_ENV = oldEnv;
    });

    it('should not include stack in production mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      const response = formatErrorResponse(error);

      expect(response.stack).toBeUndefined();

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('Rate Limiting & Throttling', () => {
    const createRateLimiter = (maxRequests: number, windowMs: number) => {
      const requests: { time: number }[] = [];

      return {
        isAllowed: (): boolean => {
          const now = Date.now();
          const withinWindow = requests.filter(r => now - r.time < windowMs);

          if (withinWindow.length >= maxRequests) {
            return false;
          }

          requests.push({ time: now });
          return true;
        },
        reset: () => {
          requests.length = 0;
        },
      };
    };

    it('should allow requests within limit', () => {
      const limiter = createRateLimiter(3, 1000);

      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter(2, 1000);

      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(false);
    });

    it('should reset on demand', () => {
      const limiter = createRateLimiter(2, 1000);

      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(true);
      expect(limiter.isAllowed()).toBe(false);

      limiter.reset();

      expect(limiter.isAllowed()).toBe(true);
    });
  });

  describe('Token Expiration Detection', () => {
    const isTokenExpired = (expiresAt: number): boolean => {
      return Date.now() >= expiresAt;
    };

    const getTokenExpiresIn = (expiresAt: number): number => {
      return Math.max(0, expiresAt - Date.now());
    };

    it('should detect expired token', () => {
      const expiredTime = Date.now() - 1000;
      expect(isTokenExpired(expiredTime)).toBe(true);
    });

    it('should detect valid token', () => {
      const futureTime = Date.now() + 3600000; // 1 hour
      expect(isTokenExpired(futureTime)).toBe(false);
    });

    it('should return correct time remaining', () => {
      const futureTime = Date.now() + 3600000;
      const expiresIn = getTokenExpiresIn(futureTime);

      expect(expiresIn).toBeGreaterThan(3599000);
      expect(expiresIn).toBeLessThanOrEqual(3600000);
    });

    it('should return 0 for expired tokens', () => {
      const expiredTime = Date.now() - 1000;
      expect(getTokenExpiresIn(expiredTime)).toBe(0);
    });
  });
});
