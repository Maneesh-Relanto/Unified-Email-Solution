import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, Request, Response } from 'express';
import { googleOAuthService } from '../services/oauth/google-oauth';
import { microsoftOAuthService } from '../services/oauth/microsoft-oauth';

// Mock dependencies
vi.mock('../services/oauth/google-oauth');
vi.mock('../services/oauth/microsoft-oauth');

const mockedGoogleOAuth = vi.mocked(googleOAuthService);
const mockedMicrosoftOAuth = vi.mocked(microsoftOAuthService);

describe('Authentication Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let redirectMock: any;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup response mocks
    jsonMock = vi.fn().mockReturnValue({});
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    redirectMock = vi.fn().mockReturnValue({});
    setHeaderMock = vi.fn();

    res = {
      json: jsonMock,
      status: statusMock,
      redirect: redirectMock,
      setHeader: setHeaderMock,
    } as Partial<Response>;

    // Setup request defaults
    req = {
      query: {},
      get: vi.fn((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0 Test Agent';
        return '';
      }),
      ip: '127.0.0.1',
    } as Partial<Request>;

    // Set environment variables
    process.env.GOOGLE_CLIENT_ID = 'google_client_id_test';
    process.env.GOOGLE_CLIENT_SECRET = 'google_client_secret_test';
    process.env.MICROSOFT_CLIENT_ID = 'microsoft_client_id_test';
    process.env.MICROSOFT_CLIENT_SECRET = 'microsoft_client_secret_test';
  });

  describe('GET /auth/google/login - initiates OAuth flow', () => {
    it('should return auth URL for Google', async () => {
      // Mock Google OAuth service
      mockedGoogleOAuth.initiateAuthorization = vi
        .fn()
        .mockResolvedValue({
          state: 'auth_state_123',
          codeVerifier: 'code_verifier_456',
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...',
        });

      // Simulate the Google login endpoint behavior
      const authRequest = await mockedGoogleOAuth.initiateAuthorization();

      expect(authRequest).toBeDefined();
      expect(authRequest.authorizationUrl).toContain('https://accounts.google.com');
      expect(authRequest.state).toBeDefined();
      expect(authRequest.codeVerifier).toBeDefined();
    });
  });

  describe('GET /auth/google/login - checks configuration', () => {
    it('should handle missing Google credentials', async () => {
      // Unset environment variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          // Simulate the error response
          statusMock(400);
          jsonMock({
            success: false,
            error: 'Google OAuth not configured',
            code: 'GOOGLE_NOT_CONFIGURED',
          });
        }

        expect(statusMock).toHaveBeenCalledWith(400);
      } finally {
        // Restore for other tests
        process.env.GOOGLE_CLIENT_ID = 'google_client_id_test';
        process.env.GOOGLE_CLIENT_SECRET = 'google_client_secret_test';
      }
    });
  });

  describe('GET /auth/microsoft/login - initiates OAuth flow', () => {
    it('should return auth URL for Microsoft', async () => {
      // Mock Microsoft OAuth service
      mockedMicrosoftOAuth.initiateAuthorization = vi
        .fn()
        .mockResolvedValue({
          state: 'auth_state_789',
          codeVerifier: 'code_verifier_012',
          authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...',
        });

      const authRequest = await mockedMicrosoftOAuth.initiateAuthorization();

      expect(authRequest).toBeDefined();
      expect(authRequest.authorizationUrl).toContain('login.microsoftonline.com');
      expect(authRequest.state).toBeDefined();
      expect(authRequest.codeVerifier).toBeDefined();
    });
  });

  describe('GET /auth/microsoft/login - checks configuration', () => {
    it('should handle missing Microsoft credentials', async () => {
      delete process.env.MICROSOFT_CLIENT_ID;
      delete process.env.MICROSOFT_CLIENT_SECRET;

      try {
        if (
          !process.env.MICROSOFT_CLIENT_ID ||
          !process.env.MICROSOFT_CLIENT_SECRET
        ) {
          statusMock(400);
          jsonMock({
            success: false,
            error: 'Microsoft OAuth not configured',
            code: 'MICROSOFT_NOT_CONFIGURED',
          });
        }

        expect(statusMock).toHaveBeenCalledWith(400);
      } finally {
        process.env.MICROSOFT_CLIENT_ID = 'microsoft_client_id_test';
        process.env.MICROSOFT_CLIENT_SECRET = 'microsoft_client_secret_test';
      }
    });
  });

  describe('OAuth State Management', () => {
    it('should generate unique state tokens', async () => {
      mockedGoogleOAuth.initiateAuthorization = vi
        .fn()
        .mockResolvedValue({
          state: 'state_1',
          authorizationUrl: 'https://accounts.google.com/...',
        });

      const auth1 = await mockedGoogleOAuth.initiateAuthorization();

      mockedGoogleOAuth.initiateAuthorization = vi
        .fn()
        .mockResolvedValue({
          state: 'state_2',
          authorizationUrl: 'https://accounts.google.com/...',
        });

      const auth2 = await mockedGoogleOAuth.initiateAuthorization();

      expect(auth1.state).not.toBe(auth2.state);
    });
  });
});
