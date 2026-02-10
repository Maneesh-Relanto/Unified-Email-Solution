/**
 * Google OAuth2 Service
 * Handles OAuth2 flow for Gmail integration
 */

import axios from 'axios';
import {
  GoogleOAuthConfig,
  GoogleAuthorizationRequest,
  GoogleTokenResponse,
  GoogleUserInfo,
  OAuthToken,
  OAuthError,
} from './types';
import {
  generatePKCEPair,
  generateState,
  storeStateData,
  buildGoogleAuthorizationUrl,
  calculateExpiresAt,
  logOAuthEvent,
  logOAuthError,
} from './oauth-utils';

export class GoogleOAuthService {
  private config: GoogleOAuthConfig;

  constructor(config: GoogleOAuthConfig) {
    this.config = config;
    logOAuthEvent('google', 'Service initialized', {
      clientId: config.clientId.substring(0, 10) + '...',
      redirectUri: config.redirectUri,
    });
  }

  /**
   * Initiate Google OAuth2 authorization flow
   * Returns authorization URL to redirect user to
   */
  async initiateAuthorization(): Promise<GoogleAuthorizationRequest> {
    try {
      logOAuthEvent('google', 'Initiating authorization flow');

      // Generate PKCE pair for security
      const { codeVerifier, codeChallenge } = generatePKCEPair();

      // Generate state for CSRF protection
      const state = generateState();

      // Store state and PKCE data for verification
      storeStateData(state, 'google', codeVerifier);

      // Build authorization URL
      const authorizationUrl = buildGoogleAuthorizationUrl(
        this.config.clientId,
        this.config.redirectUri,
        state,
        codeChallenge
      );

      logOAuthEvent('google', 'Authorization URL generated', { state: state.substring(0, 8) + '...' });

      return {
        authorizationUrl,
        state,
        codeVerifier,
      };
    } catch (error) {
      logOAuthError('google', 'Failed to initiate authorization', error);
      throw new OAuthError('GOOGLE_INIT_FAILED', 'Failed to initiate Google OAuth2 flow', 'google');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<OAuthToken> {
    try {
      logOAuthEvent('google', 'Exchanging authorization code for token', {
        code: code.substring(0, 10) + '...',
      });

      const response = await axios.post<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      });

      const tokenData = response.data;

      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: calculateExpiresAt(tokenData.expires_in),
        tokenType: 'Bearer',
        scope: tokenData.scope,
      };

      logOAuthEvent('google', 'Token exchanged successfully', {
        expiresIn: tokenData.expires_in,
        hasRefreshToken: !!tokenData.refresh_token,
      });

      return token;
    } catch (error) {
      logOAuthError('google', 'Token exchange failed', error);

      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as any;
        throw new OAuthError(
          errorData.error || 'TOKEN_EXCHANGE_FAILED',
          errorData.error_description || 'Failed to exchange authorization code for token',
          'google'
        );
      }

      throw new OAuthError('TOKEN_EXCHANGE_FAILED', 'Failed to exchange authorization code for token', 'google');
    }
  }

  /**
   * Refresh OAuth token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    try {
      logOAuthEvent('google', 'Refreshing access token');

      const response = await axios.post<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const tokenData = response.data;

      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep old one
        expiresIn: tokenData.expires_in,
        expiresAt: calculateExpiresAt(tokenData.expires_in),
        tokenType: 'Bearer',
        scope: tokenData.scope,
      };

      logOAuthEvent('google', 'Token refreshed successfully', {
        expiresIn: tokenData.expires_in,
      });

      return token;
    } catch (error) {
      logOAuthError('google', 'Token refresh failed', error);
      throw new OAuthError('TOKEN_REFRESH_FAILED', 'Failed to refresh access token', 'google');
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      logOAuthEvent('google', 'Fetching user information');

      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      logOAuthEvent('google', 'User information fetched', {
        email: response.data.email,
        id: response.data.id.substring(0, 8) + '...',
      });

      return response.data;
    } catch (error) {
      logOAuthError('google', 'Failed to fetch user information', error);
      throw new OAuthError('USER_INFO_FETCH_FAILED', 'Failed to fetch user information', 'google');
    }
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      logOAuthEvent('google', 'Revoking token');

      await axios.post(`https://oauth2.googleapis.com/revoke`, {
        token,
      });

      logOAuthEvent('google', 'Token revoked successfully');
    } catch (error) {
      logOAuthError('google', 'Token revocation failed', error);
      // Don't throw error - revocation failures are not critical
      // The token will eventually expire if revocation fails
    }
  }

  /**
   * Validate access token is still valid
   */
  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        params: { access_token: accessToken },
      });

      return !!response.data.access_token;
    } catch (error) {
      return false;
    }
  }
}

// Lazy-initialized singleton instance
// This ensures environment variables are loaded before initialization
let _googleOAuthServiceInstance: GoogleOAuthService | null = null;

export const googleOAuthService = new Proxy({} as GoogleOAuthService, {
  get(_target, prop) {
    if (!_googleOAuthServiceInstance) {
      _googleOAuthServiceInstance = new GoogleOAuthService({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
      });
    }
    return (_googleOAuthServiceInstance as any)[prop];
  },
});