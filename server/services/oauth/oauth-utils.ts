/**
 * OAuth2 Utility Functions
 * PKCE, State Management, and Helper Functions
 */

import crypto from 'node:crypto';
import { StateData, PKCEPair } from './types';

// ===== PKCE (Proof Key for Code Exchange) =====

/**
 * Generate PKCE code verifier and challenge
 * Used for secure authorization code flow
 */
export function generatePKCEPair(): PKCEPair {
  // Generate random 43-128 character string
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  // Create challenge by hashing the verifier
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// ===== STATE MANAGEMENT =====

/**
 * Generate secure random state for OAuth flow
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store state with PKCE data for verification later
 * Using in-memory Map (use Redis in production)
 */
const stateStore = new Map<string, StateData>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (data.expiresAt < now) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Store state with PKCE data for verification
 * States expire after 10 minutes
 */
export function storeStateData(
  state: string,
  provider: 'google' | 'microsoft',
  codeVerifier: string
): StateData {
  const now = Date.now();
  const stateData: StateData = {
    state,
    codeVerifier,
    provider,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
  };

  stateStore.set(state, stateData);
  return stateData;
}

/**
 * Retrieve and validate state data
 * Deletes state after retrieval (one-time use)
 */
export function getAndDeleteStateData(state: string): StateData | null {
  const stateData = stateStore.get(state);

  if (!stateData) {
    return null;
  }

  // Check if state has expired
  if (stateData.expiresAt < Date.now()) {
    stateStore.delete(state);
    return null;
  }

  // Delete after retrieval (one-time use)
  stateStore.delete(state);

  return stateData;
}

// ===== OAUTH URL BUILDERS =====

/**
 * Build Google authorization URL
 */
export function buildGoogleAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
  scopes: string[] = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Build Microsoft authorization URL
 */
export function buildMicrosoftAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
  scopes: string[] = [
    'Mail.Read',
    'Mail.Send',
    'offline_access', // For refresh token
  ]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    response_mode: 'query',
    prompt: 'select_account', // Force account selection
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  
  // Log the full URL for debugging
  console.log('[OAUTH] [MICROSOFT] Authorization URL:', authUrl.substring(0, 200) + '...');
  console.log('[OAUTH] [MICROSOFT] Scopes:', scopes);
  console.log('[OAUTH] [MICROSOFT] Client ID:', clientId);
  
  return authUrl;
}

// ===== TOKEN VALIDATION =====

/**
 * Check if OAuth token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  // Consider it expired if less than 5 minutes left
  const bufferMs = 5 * 60 * 1000;
  return Date.now() > expiresAt - bufferMs;
}

/**
 * Calculate token expiration timestamp
 */
export function calculateExpiresAt(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

// ===== LOGGING HELPERS =====

/**
 * Log OAuth events for debugging
 */
export function logOAuthEvent(
  provider: 'google' | 'microsoft',
  event: string,
  details?: any
): void {
  const timestamp = new Date().toISOString();
  console.log(`[OAUTH] [${provider.toUpperCase()}] [${timestamp}] ${event}`, details || '');
}

export function logOAuthError(
  provider: 'google' | 'microsoft',
  event: string,
  error: any
): void {
  const timestamp = new Date().toISOString();
  console.error(`[OAUTH-ERROR] [${provider.toUpperCase()}] [${timestamp}] ${event}`, error);
}
