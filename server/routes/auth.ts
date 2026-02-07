/**
 * Authentication Routes
 * Handles OAuth2 login, callback, and token management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { GoogleOAuthService, googleOAuthService } from '../services/oauth/google-oauth';
import { MicrosoftOAuthService, microsoftOAuthService } from '../services/oauth/microsoft-oauth';
import {
  getAndDeleteStateData,
  logOAuthEvent,
  logOAuthError,
  isTokenExpired,
} from '../services/oauth/oauth-utils';
import {
  OAuthError,
  TokenExchangeResponse,
  AuthorizationInitResponse,
  StoredOAuthCredential,
  OAuthErrorResponse,
} from '../services/oauth/types';
import { emailCredentialStore } from '../config/email-config';
import { encrypt, decrypt } from '../utils/crypto';

const router = Router();

// ===== ERROR HANDLER MIDDLEWARE =====

/**
 * Centralized error handler for OAuth routes
 */
function handleOAuthError(error: any, res: Response, provider: string) {
  logOAuthError(provider as any, 'Route error', error);

  if (error instanceof OAuthError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code,
      provider: error.provider,
    } as OAuthErrorResponse);
  }

  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    message: error.message,
  } as OAuthErrorResponse);
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
      return res.status(400).json({
        success: false,
        error: 'Google OAuth not configured',
        code: 'GOOGLE_NOT_CONFIGURED',
      });
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
    (global as any)[stateKey] = source;

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
      return res.status(400).json({
        success: false,
        error: error_description || 'Authorization failed',
        code: error,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
        code: 'MISSING_PARAMETERS',
      });
    }

    // Validate state
    const stateData = getAndDeleteStateData(state as string);
    if (!stateData) {
      logOAuthError('google', 'Invalid or expired state', { state });
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state',
        code: 'INVALID_STATE',
      });
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
    const source = (global as any)[stateKey] || 'integration';
    delete (global as any)[stateKey]; // Clean up

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
      return res.status(400).json({
        success: false,
        error: 'Microsoft OAuth not configured',
        code: 'MICROSOFT_NOT_CONFIGURED',
      });
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
    (global as any)[stateKey] = source;

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
      return res.status(400).json({
        success: false,
        error: error_description || 'Authorization failed',
        code: error,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
        code: 'MISSING_PARAMETERS',
      });
    }

    // Validate state
    const stateData = getAndDeleteStateData(state as string);
    if (!stateData) {
      logOAuthError('microsoft', 'Invalid or expired state', { state });
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state',
        code: 'INVALID_STATE',
      });
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
    const source = (global as any)[stateKey] || 'integration';
    delete (global as any)[stateKey]; // Clean up

    // Redirect based on source
    const redirectPath = source === 'settings' ? '/settings' : '/oauth-integration';
    const redirectUrl = `http://localhost:8080${redirectPath}?authenticated=true&provider=microsoft&email=${encodeURIComponent(email)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    handleOAuthError(error, res, 'microsoft');
  }
});

export {
  emailCredentialStore,
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
      })),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logOAuthError('system' as any, 'Status check failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check auth status',
    });
  }
}

export async function handleAuthDisconnect(req: Request, res: Response) {
  try {
    const { provider, email } = req.body;

    if (!provider || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing provider or email',
      });
    }

    const credential = emailCredentialStore.getOAuthCredential(`${provider}_${email}`);

    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
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
      logOAuthError(provider as any, 'Token revocation failed', error);
      // Continue with deletion even if revocation fails
    }

    // Delete credential
    emailCredentialStore.removeOAuthCredential(`${provider}_${email}`);

    logOAuthEvent(provider as any, 'Disconnect successful', { email });

    res.json({
      success: true,
      message: `Disconnected from ${provider}`,
    });
  } catch (error) {
    logOAuthError('system' as any, 'Disconnect failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect',
    });
  }
}

export default router;
