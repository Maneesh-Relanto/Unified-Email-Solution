/**
 * Authentication Routes
 * Handles OAuth2 login, callback, and token management
 */

import { Router, Request, Response } from 'express';
import { googleOAuthService } from '../services/oauth/google-oauth';
import { microsoftOAuthService } from '../services/oauth/microsoft-oauth';
import {
  getAndDeleteStateData,
  logOAuthEvent,
  logOAuthError,
  isTokenExpired,
} from '../services/oauth/oauth-utils';
import {
  OAuthError,
  StoredOAuthCredential,
  OAuthErrorResponse,
} from '../services/oauth/types';
import { emailCredentialStore } from '../config/email-config';
import { encrypt, decrypt } from '../utils/crypto';
import { secureConsole } from '../utils/logging-sanitizer';
import {
  sendValidationError,
  sendAuthenticationError,
  sendInternalError,
  ErrorCategory,
} from '../utils/error-handler';

const router = Router();

// ===== ERROR HANDLER MIDDLEWARE =====

/**
 * Centralized error handler for OAuth routes
 */
function handleOAuthError(error: any, res: Response, provider: string) {
  logOAuthError(provider as any, 'Route error', error);

  if (error instanceof OAuthError) {
    return sendValidationError(res, error, {
      provider,
      code: error.code,
    });
  }

  return sendInternalError(res, error, {
    provider,
    action: 'oauth-callback',
  });
}

// ===== GOOGLE OAUTH ROUTES =====

/**
 * GET /auth/google/login
 * Initiates Google OAuth2 flow
 * Query params:
 *   - source: 'settings' or 'integration' (defaults to 'integration')
 */
router.get('/google/login', async (req: Request, res: Response) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return sendValidationError(res, new Error('Google OAuth not configured'));
    }

    const source = (req.query.source || 'integration') as string;

    logOAuthEvent('google', 'Login initiated from', {
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 50),
      source,
    });

    const authRequest = await googleOAuthService.initiateAuthorization();

    // Store state in session (or use httpOnly cookie in production)
    res.setHeader('Set-Cookie', `oauth_state=${authRequest.state}; Path=/; HttpOnly`);
    
    // Store source information with state for use in callback
    const stateKey = `oauth_source_${authRequest.state}`;
    globalThis[stateKey as any] = source;

    // Directly redirect to Google's OAuth endpoint
    res.redirect(authRequest.authorizationUrl);
  } catch (error) {
    handleOAuthError(error, res, 'google');
  }
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth2 callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logOAuthError('google', 'Authorization failed', {
        error,
        error_description,
      });
      return sendValidationError(res, new Error('Authorization failed'));
    }

    if (!code || !state) {
      return sendValidationError(res, new Error('Missing required parameters'));
    }

    // Validate state
    const stateData = getAndDeleteStateData(state as string);
    if (!stateData) {
      logOAuthError('google', 'Invalid or expired state', { state });
      return sendValidationError(res, new Error('Invalid or expired state'));
    }

    logOAuthEvent('google', 'Callback received', {
      state: state as string,
      codeLength: (code as string)?.length,
    });

    // Exchange code for token
    const token = await googleOAuthService.exchangeCodeForToken(
      code as string,
      state as string,
      stateData.codeVerifier
    );

    // Get user info
    const userInfo = await googleOAuthService.getUserInfo(token.accessToken);

    // Store credential
    const credential: StoredOAuthCredential = {
      provider: 'google',
      email: userInfo.email,
      oauthToken: token,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Encrypt and store
    const encryptedCredential = {
      ...credential,
      oauthToken: {
        ...token,
        accessToken: encrypt(token.accessToken),
        refreshToken: token.refreshToken ? encrypt(token.refreshToken) : undefined,
      },
    };

    emailCredentialStore.setOAuthCredential(`google_${userInfo.email}`, encryptedCredential);

    logOAuthEvent('google', 'Authorization successful', {
      email: userInfo.email,
      expiresIn: token.expiresIn,
    });

    // Get source from state data
    const stateKey = `oauth_source_${state}`;
    const source = globalThis[stateKey as any] || 'integration';
    delete globalThis[stateKey as any]; // Clean up

    // Redirect based on source
    const redirectPath = source === 'settings' ? '/settings' : '/oauth-integration';
    const redirectUrl = `http://localhost:8080${redirectPath}?authenticated=true&provider=google&email=${encodeURIComponent(userInfo.email)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    handleOAuthError(error, res, 'google');
  }
});

// ===== MICROSOFT OAUTH ROUTES =====

/**
 * GET /auth/microsoft/login
 * Initiates Microsoft OAuth2 flow
 * Query params:
 *   - source: 'settings' or 'integration' (defaults to 'integration')
 */
router.get('/microsoft/login', async (req: Request, res: Response) => {
  try {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return sendValidationError(res, new Error('Microsoft OAuth not configured'));
    }

    const source = (req.query.source || 'integration') as string;

    logOAuthEvent('microsoft', 'Login initiated from', {
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 50),
      source,
    });

    const authRequest = await microsoftOAuthService.initiateAuthorization();

    res.setHeader('Set-Cookie', `oauth_state=${authRequest.state}; Path=/; HttpOnly`);
    
    // Store source information with state
    const stateKey = `oauth_source_${authRequest.state}`;
    globalThis[stateKey as any] = source;

    // Directly redirect to Microsoft's OAuth endpoint
    res.redirect(authRequest.authorizationUrl);
  } catch (error) {
    handleOAuthError(error, res, 'microsoft');
  }
});

/**
 * GET /auth/microsoft/callback
 * Handles Microsoft OAuth2 callback
 */
router.get('/microsoft/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logOAuthError('microsoft', 'Authorization failed', {
        error,
        error_description,
      });
      return sendValidationError(res, new Error('Authorization failed'));
    }

    if (!code || !state) {
      return sendValidationError(res, new Error('Missing required parameters'));
    }

    // Validate state
    const stateData = getAndDeleteStateData(state as string);
    if (!stateData) {
      logOAuthError('microsoft', 'Invalid or expired state', { state });
      return sendValidationError(res, new Error('Invalid or expired state'));
    }

    logOAuthEvent('microsoft', 'Callback received', {
      state: state as string,
      codeLength: (code as string)?.length,
    });

    // Exchange code for token
    const token = await microsoftOAuthService.exchangeCodeForToken(
      code as string,
      state as string,
      stateData.codeVerifier
    );

    // Get user info
    const userInfo = await microsoftOAuthService.getUserInfo(token.accessToken);
    const email = userInfo.mail || userInfo.userPrincipalName;

    // Store credential
    const credential: StoredOAuthCredential = {
      provider: 'microsoft',
      email,
      oauthToken: token,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Encrypt and store
    const encryptedCredential = {
      ...credential,
      oauthToken: {
        ...token,
        accessToken: encrypt(token.accessToken),
        refreshToken: token.refreshToken ? encrypt(token.refreshToken) : undefined,
      },
    };

    emailCredentialStore.setOAuthCredential(`microsoft_${email}`, encryptedCredential);

    logOAuthEvent('microsoft', 'Authorization successful', {
      email,
      expiresIn: token.expiresIn,
    });

    // Get source from state data
    const stateKey = `oauth_source_${state}`;
    const source = globalThis[stateKey as any] || 'integration';
    delete globalThis[stateKey as any]; // Clean up

    // Redirect based on source
    const redirectPath = source === 'settings' ? '/settings' : '/oauth-integration';
    const redirectUrl = `http://localhost:8080${redirectPath}?authenticated=true&provider=microsoft&email=${encodeURIComponent(email)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    handleOAuthError(error, res, 'microsoft');
  }
});

export {
  getAndDeleteStateData,
  logOAuthEvent,
  logOAuthError,
  isTokenExpired,
} from '../services/oauth/oauth-utils';

export { googleOAuthService } from '../services/oauth/google-oauth';
export { microsoftOAuthService } from '../services/oauth/microsoft-oauth';

// Auth status endpoints are exported to be handled separately in index.ts
export async function handleAuthStatus(req: Request, res: Response) {
  try {
    const credentials = emailCredentialStore.getAllOAuthCredentials();

    const status = {
      authenticated: credentials.length > 0,
      providers: credentials.map(cred => ({
        provider: cred.provider,
        email: cred.email,
        expiresAt: cred.oauthToken.expiresAt,
        isExpired: isTokenExpired(cred.oauthToken.expiresAt),
        createdAt: cred.createdAt instanceof Date ? cred.createdAt.toISOString() : cred.createdAt,
        updatedAt: cred.updatedAt instanceof Date ? cred.updatedAt.toISOString() : cred.updatedAt,
      })),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logOAuthError('system' as any, 'Status check failed', error);
    sendInternalError(res, error, { action: 'handleAuthStatus' });
  }
}

/**
 * GET /api/email/oauth-config
 * Returns OAuth provider configuration status from environment
 */
export async function handleOAuthConfigStatus(req: Request, res: Response) {
  try {
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

    const config = {
      google: {
        configured: googleConfigured,
        provider: 'Gmail',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
      },
      microsoft: {
        configured: microsoftConfigured,
        provider: 'Outlook',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:8080/auth/microsoft/callback',
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logOAuthError('system' as any, 'OAuth config check failed', error);
    sendInternalError(res, error, { action: 'handleOAuthConfigStatus' });
  }
}

export async function handleAuthDisconnect(req: Request, res: Response) {
  try {
    const { provider, email } = req.body;

    if (!provider || !email) {
      return sendValidationError(res, new Error('Missing required parameters'));
    }

    const credential = emailCredentialStore.getOAuthCredential(`${provider}_${email}`);

    if (!credential) {
      return sendValidationError(res, new Error('Credential not found'));
    }

    // Revoke token
    try {
      const decryptedToken = decrypt(credential.oauthToken.accessToken);

      if (provider === 'google') {
        await googleOAuthService.revokeToken(decryptedToken);
      } else if (provider === 'microsoft') {
        await microsoftOAuthService.revokeToken(decryptedToken);
      }
    } catch (error) {
      logOAuthError(provider, 'Token revocation failed', error);
      // Continue with deletion even if revocation fails
    }

    // Delete credential
    emailCredentialStore.removeOAuthCredential(`${provider}_${email}`);

    logOAuthEvent(provider, 'Disconnect successful', { email });

    res.json({
      success: true,
      message: `Disconnected successfully`,
    });
  } catch (error) {
    logOAuthError('system' as any, 'Disconnect failed', error);
    sendInternalError(res, error, { action: 'handleAuthDisconnect' });
  }
}

export default router;
