/**
 * Microsoft OAuth2 Service
 * Handles OAuth2 flow for Outlook.com integration
 */

import axios from 'axios';
import {
  MicrosoftOAuthConfig,
  MicrosoftAuthorizationRequest,
  MicrosoftTokenResponse,
  MicrosoftUserInfo,
  OAuthToken,
  OAuthError,
} from './types';
import {
  generatePKCEPair,
  generateState,
  storeStateData,
  buildMicrosoftAuthorizationUrl,
  calculateExpiresAt,
  logOAuthEvent,
  logOAuthError,
} from './oauth-utils';

export class MicrosoftOAuthService {
  private config: MicrosoftOAuthConfig;

  constructor(config: MicrosoftOAuthConfig) {
    this.config = config;
    logOAuthEvent('microsoft', 'Service initialized', {
      clientId: config.clientId.substring(0, 10) + '...',
      redirectUri: config.redirectUri,
    });
  }

  /**
   * Initiate Microsoft OAuth2 authorization flow
   * Returns authorization URL to redirect user to
   */
  async initiateAuthorization(): Promise<MicrosoftAuthorizationRequest> {
    try {
      logOAuthEvent('microsoft', 'Initiating authorization flow');

      // Generate PKCE pair for security
      const { codeVerifier, codeChallenge } = generatePKCEPair();

      // Generate state for CSRF protection
      const state = generateState();

      // Store state and PKCE data for verification
      storeStateData(state, 'microsoft', codeVerifier);

      // Build authorization URL
      const authorizationUrl = buildMicrosoftAuthorizationUrl(
        this.config.clientId,
        this.config.redirectUri,
        state,
        codeChallenge,
        [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Mail.ReadWrite',
          'https://graph.microsoft.com/User.Read',
          'offline_access',
        ]
      );

      logOAuthEvent('microsoft', 'Authorization URL generated', { state: state.substring(0, 8) + '...' });

      return {
        authorizationUrl,
        state,
        codeVerifier,
      };
    } catch (error) {
      logOAuthError('microsoft', 'Failed to initiate authorization', error);
      throw new OAuthError('MICROSOFT_INIT_FAILED', 'Failed to initiate Microsoft OAuth2 flow', 'microsoft');
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
      logOAuthEvent('microsoft', 'Exchanging authorization code for token', {
        code: code.substring(0, 10) + '...',
      });

      const response = await axios.post<MicrosoftTokenResponse>(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;

      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: calculateExpiresAt(tokenData.expires_in),
        tokenType: 'Bearer',
        scope: tokenData.scope,
      };

      logOAuthEvent('microsoft', 'Token exchanged successfully', {
        expiresIn: tokenData.expires_in,
        hasRefreshToken: !!tokenData.refresh_token,
      });

      return token;
    } catch (error) {
      logOAuthError('microsoft', 'Token exchange failed', error);

      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as any;
        throw new OAuthError(
          errorData.error || 'TOKEN_EXCHANGE_FAILED',
          errorData.error_description || 'Failed to exchange authorization code for token',
          'microsoft'
        );
      }

      throw new OAuthError(
        'TOKEN_EXCHANGE_FAILED',
        'Failed to exchange authorization code for token',
        'microsoft'
      );
    }
  }

  /**
   * Refresh OAuth token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    try {
      logOAuthEvent('microsoft', 'Refreshing access token');

      const response = await axios.post<MicrosoftTokenResponse>(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;

      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresIn: tokenData.expires_in,
        expiresAt: calculateExpiresAt(tokenData.expires_in),
        tokenType: 'Bearer',
        scope: tokenData.scope,
      };

      logOAuthEvent('microsoft', 'Token refreshed successfully', {
        expiresIn: tokenData.expires_in,
      });

      return token;
    } catch (error) {
      logOAuthError('microsoft', 'Token refresh failed', error);
      throw new OAuthError('TOKEN_REFRESH_FAILED', 'Failed to refresh access token', 'microsoft');
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      logOAuthEvent('microsoft', 'Fetching user information');

      const response = await axios.get<MicrosoftUserInfo>('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      logOAuthEvent('microsoft', 'User information fetched', {
        email: response.data.mail || response.data.userPrincipalName,
        id: response.data.id.substring(0, 8) + '...',
      });

      return response.data;
    } catch (error) {
      logOAuthError('microsoft', 'Failed to fetch user information', error);
      throw new OAuthError('USER_INFO_FETCH_FAILED', 'Failed to fetch user information', 'microsoft');
    }
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      logOAuthEvent('microsoft', 'Revoking token');

      await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
        new URLSearchParams({
          token,
          token_type_hint: 'access_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logOAuthEvent('microsoft', 'Token revoked successfully');
    } catch (error) {
      logOAuthError('microsoft', 'Token revocation failed', error);
      // Don't throw error - revocation failures are not critical
    }
  }

  /**
   * Validate access token is still valid
   */
  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return !!response.data.id;
    } catch (error) {
      return false;
    }
  }
}
// Export singleton instance
export const microsoftOAuthService = new MicrosoftOAuthService({
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:8080/auth/microsoft/callback',
});