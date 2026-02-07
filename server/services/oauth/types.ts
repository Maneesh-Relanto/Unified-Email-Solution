/**
 * OAuth2 Types and Interfaces
 * Covers Google and Microsoft authentication flows
 */

// ===== OAUTH TOKEN TYPES =====

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  expiresAt: number; // unix timestamp
  tokenType: 'Bearer';
  scope: string;
}

export interface StoredOAuthCredential {
  provider: 'google' | 'microsoft';
  email: string;
  oauthToken: OAuthToken;
  createdAt: Date;
  updatedAt: Date;
}

// ===== GOOGLE OAUTH TYPES =====

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleAuthorizationRequest {
  authorizationUrl: string;
  state: string; // PKCE state for security
  codeVerifier: string; // PKCE code verifier
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
  locale: string;
}

// ===== MICROSOFT OAUTH TYPES =====

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string; // for multi-tenant apps
}

export interface MicrosoftAuthorizationRequest {
  authorizationUrl: string;
  state: string; // PKCE state for security
  codeVerifier: string; // PKCE code verifier
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  id_token?: string;
  ext_expires_in?: number;
}

export interface MicrosoftUserInfo {
  id: string;
  userPrincipalName: string;
  givenName: string;
  surname: string;
  mail: string;
  mobilePhone?: string;
}

// ===== OAUTH FLOW TYPES =====

export interface AuthorizationResponse {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

export interface AuthorizationInitRequest {
  provider: 'google' | 'microsoft';
}

export interface AuthorizationInitResponse {
  authorizationUrl: string;
  state: string;
}

export interface TokenExchangeRequest {
  code: string;
  state: string;
  provider: 'google' | 'microsoft';
}

export interface TokenExchangeResponse {
  success: boolean;
  provider: 'google' | 'microsoft';
  email: string;
  credential: StoredOAuthCredential;
  message: string;
}

// ===== ERROR TYPES =====

export class OAuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public provider?: 'google' | 'microsoft'
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

export interface OAuthErrorResponse {
  success: false;
  error: string;
  code: string;
  message: string;
  provider?: string;
  details?: any;
}

// ===== PKCE TYPES =====

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface StateData {
  state: string;
  codeVerifier: string;
  provider: 'google' | 'microsoft';
  createdAt: number;
  expiresAt: number;
}

// ===== OAUTH SERVICE INTERFACE =====

export interface IOAuthService {
  initiateAuthorization(provider: 'google' | 'microsoft'): Promise<AuthorizationInitResponse>;
  exchangeAuthorizationCode(request: TokenExchangeRequest): Promise<TokenExchangeResponse>;
  refreshToken(provider: 'google' | 'microsoft', refreshToken: string): Promise<OAuthToken>;
  revokeToken(provider: 'google' | 'microsoft', token: string): Promise<void>;
  getUserInfo(provider: 'google' | 'microsoft', accessToken: string): Promise<GoogleUserInfo | MicrosoftUserInfo>;
}
