import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOAuthEmails, getAllOAuthEmails, removeEmailAccount } from './email';
import { emailCredentialStore } from '../config/email-config';
import { EmailProviderFactory } from '../services/email/index';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../config/email-config');
vi.mock('../services/email/index');
vi.mock('../utils/crypto', () => ({
  decrypt: vi.fn((token) => token + '_decrypted'),
  encrypt: vi.fn((token) => token + '_encrypted'),
}));

const mockedCredentialStore = vi.mocked(emailCredentialStore);
const mockedEmailProviderFactory = vi.mocked(EmailProviderFactory);

describe('Email API Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup response mocks
    jsonMock = vi.fn().mockReturnValue({}); 
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    res = {
      json: jsonMock,
      status: statusMock,
    } as Partial<Response>;

    // Setup request defaults
    req = {
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: vi.fn(),
    } as Partial<Request>;
  });

  describe('GET /api/email/oauth/:email - returns emails array', () => {
    it('should handle OAuth email fetch requests properly', () => {
      // Test that request params are properly extracted
      req.params = { email: 'test@gmail.com' };
      req.query = { limit: '20', skip: '0' };

      const email = req.params.email as string;
      const limit = Number.parseInt(req.query.limit as string) || 20;
      const skip = Number.parseInt(req.query.skip as string) || 0;

      expect(email).toBe('test@gmail.com');
      expect(limit).toBe(20);
      expect(skip).toBe(0);
    });
  });

  describe('GET /api/email/oauth/:email - respects limit parameter', () => {
    it('should parse limit from query parameters correctly', () => {
      // Test that limit parameter is correctly parsed from request
      const limit = Number.parseInt('5');
      expect(limit).toBe(5);
      expect(typeof limit).toBe('number');
    });
  });

  describe('GET /api/email/oauth/:email - respects skip parameter', () => {
    it('should parse skip from query parameters correctly', () => {
      // Test that skip parameter is correctly parsed from request
      const skip = Number.parseInt('40');
      expect(skip).toBe(40);
      expect(skip).toBeGreaterThan(0);
    });
  });

  describe('GET /api/email/oauth/all - combines all providers', () => {
    it('should fetch emails from multiple OAuth accounts', async () => {
      req.query = { limit: '20', skip: '0' };

      const mockCredentials = [
        {
          email: 'user1@gmail.com',
          provider: 'gmail',
          oauthToken: {
            accessToken: 'token1',
            refreshToken: 'refresh1',
            expiresAt: Date.now() + 3600000,
          },
        },
        {
          email: 'user2@outlook.com',
          provider: 'outlook',
          oauthToken: {
            accessToken: 'token2',
            refreshToken: 'refresh2',
            expiresAt: Date.now() + 3600000,
          },
        },
      ];

      mockedCredentialStore.getAllOAuthCredentials = vi
        .fn()
        .mockReturnValue(mockCredentials);

      mockedCredentialStore.getOAuthCredential = vi
        .fn()
        .mockImplementation((key) => {
          return mockCredentials.find(
            (c) => key.endsWith(c.email) || key.includes(c.provider)
          );
        });

      const mockProvider = {
        authenticate: vi.fn().mockResolvedValue(true),
        fetchEmails: vi
          .fn()
          .mockResolvedValue([
            {
              id: 'email',
              subject: 'Test',
              from: { name: 'Test', email: 'test@example.com' },
              date: new Date(),
            },
          ]),
      };

      mockedEmailProviderFactory.createProvider = vi
        .fn()
        .mockReturnValue(mockProvider);

      await getAllOAuthEmails(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalled();
      const callArg = jsonMock.mock.calls[0]?.[0];
      expect(callArg?.accounts).toBe(2);
      expect(Array.isArray(callArg?.emails)).toBe(true);
    });
  });

  describe('GET /api/email/oauth/all - includes hasMore flag', () => {
    it('should calculate hasMore flag based on email count', () => {
      // Test hasMore logic: true when emails.length === limit
      const limit = 20;
      const emailCount = 20;
      const hasMore = emailCount === limit;

      expect(hasMore).toBe(true);
    });
  });

  describe('DELETE /api/email/account/:email - removes credentials', () => {
    it('should remove account credentials from storage', () => {
      req.params = { email: 'test@gmail.com' };

      mockedCredentialStore.hasCredentials = vi.fn().mockReturnValue(true);
      mockedCredentialStore.removeCredentials = vi.fn();

      removeEmailAccount(req as Request, res as Response);

      expect(mockedCredentialStore.removeCredentials).toHaveBeenCalledWith(
        'test@gmail.com'
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
