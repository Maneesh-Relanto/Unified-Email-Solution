# OAuth2 Implementation Guide

Complete OAuth2 authentication system for Gmail and Outlook email access.

> 🚀 **New to Emailify?** Start with [QUICK_START.md](../QUICK_START.md) for a step-by-step setup guide.  
> This document provides technical details for developers who want to understand the OAuth implementation.

## Overview

**Status**: ✅ Production-Ready
**Version**: 1.0
**Last Updated**: February 7, 2026

This implementation provides secure OAuth2 authentication for:
- **Google** (Gmail)
- **Microsoft** (Outlook)

## Architecture

### OAuth2 Flow (Authorization Code with PKCE)

```
1. User clicks "Sign in with Google/Microsoft"
2. Frontend redirects to /auth/{provider}/login
3. Backend generates PKCE pair + state token
4. Backend returns authorization URL to frontend
5. Frontend opens Google/Microsoft login page
6. User logs in and grants permissions
7. Provider redirects to /auth/{provider}/callback with authorization code
8. Backend exchanges code for access token (using PKCE verifier)
9. Backend fetches user email and stores encrypted credential
10. Frontend redirected to app with authenticated session
```

### Security Features

✅ **PKCE (Proof Key for Code Exchange)**
- S256 method with SHA256 hashing
- 43+ character code verifiers
- Base64url encoding
- Protection against authorization code interception

✅ **State Tokens**
- Random 64-character hex strings
- 10-minute expiration
- One-time use
- CSRF protection

✅ **Token Encryption**
- AES-256-CBC encryption at rest
- PKCS#7 padding
- IV stored with ciphertext: `iv:encrypted`
- Automatic decryption on retrieval

✅ **HTTPS Ready**
- Production redirect URIs can use HTTPS
- Development uses http://localhost:8080
- Exact redirect URI matching (prevents substitution attacks)

## Installation & Setup

### 1. Install Dependencies

```bash
pnpm add axios google-auth-library @azure/identity @microsoft/microsoft-graph-client
```

Already installed versions:
- `axios` ^1.13.4
- `google-auth-library` ^10.5.0
- `@azure/identity` ^4.13.0
- `@microsoft/microsoft-graph-client` ^3.0.7

### 2. Google OAuth Setup

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable "Google+ API"
4. Go to "Credentials" → Create OAuth 2.0 Client ID
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:8080/auth/google/callback`
7. Copy Client ID and Client Secret

**Add to .env:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
```

**Scopes Requested:**
- `openid` - OpenID Connect identity
- `email` - User email address
- `profile` - Basic profile info
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail
- `https://www.googleapis.com/auth/gmail.send` - Send Gmail
- Requested as: `offline_access` for refresh tokens

### 3. Microsoft OAuth Setup

**Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Set Redirect URI: `http://localhost:8080/auth/microsoft/callback`
5. Go to "Certificates & secrets" → Create client secret
6. Copy Application (client) ID and secret value

**Add to .env:**
```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/microsoft/callback
```

**Scopes Requested:**
- `Mail.Read` - Read emails
- `Mail.Send` - Send emails
- `offline_access` - Refresh tokens

### 4. Encryption Key Generation

Generate 32-byte encryption key:

```typescript
import crypto from 'crypto';
const key = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY=' + key);
```

**Add to .env:**
```env
ENCRYPTION_KEY=your-32-byte-hex-key
```

## File Structure

```
server/
└── services/
    ├── oauth/                          # OAuth services
    │   ├── types.ts                    # Type definitions
    │   ├── oauth-utils.ts              # PKCE, state management, URL builders
    │   ├── google-oauth.ts             # Google OAuth implementation
    │   └── microsoft-oauth.ts          # Microsoft OAuth implementation
    └── email-service.ts                # Email fetching service

server/
└── routes/
    └── auth.ts                         # 6 OAuth API endpoints

server/
└── config/
    └── email-config.ts                 # Credential storage with encryption

server/
└── utils/
    └── crypto.ts                       # AES-256-CBC encryption utilities
```

## API Endpoints

### Login Endpoints

#### Start Google Login
```
GET /auth/google/login

Returns:
{
  "success": true,
  "data": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "64-char-hex-string"
  }
}
```

#### Start Microsoft Login
```
GET /auth/microsoft/login

Returns:
{
  "success": true,
  "data": {
    "authorizationUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
    "state": "64-char-hex-string"
  }
}
```

### Callback Endpoints (Automatic)

```
GET /auth/google/callback?code=...&state=...
GET /auth/microsoft/callback?code=...&state=...

Redirects to: /?authenticated=true
Sets credentials in storage
```

### Status Endpoint

```
GET /api/email/auth/status

Returns:
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "google",
        "email": "user@gmail.com",
        "expiresAt": 1770468587685,
        "expiresIn": 3599
      }
    ]
  }
}
```

### Disconnect Endpoint

```
POST /api/email/auth/disconnect

Body: {
  "provider": "google",
  "email": "user@gmail.com"
}

Returns:
{
  "success": true,
  "message": "Credential revoked and removed"
}
```

## Type Definitions

### OAuthToken
```typescript
interface OAuthToken {
  accessToken: string;      // Bearer token for API calls
  refreshToken: string;     // Token to refresh access token
  expiresIn: number;        // Seconds until expiration
  expiresAt: number;        // Unix timestamp of expiration
  tokenType: string;        // Usually "Bearer"
  scope: string;            // Space-separated scopes granted
}
```

### StoredOAuthCredential
```typescript
interface StoredOAuthCredential {
  provider: string;         // "google" or "microsoft"
  email: string;            // User email address
  oauthToken: OAuthToken;
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}
```

### PKCE
```typescript
interface PKCEPair {
  codeVerifier: string;     // 43+ random characters
  codeChallenge: string;    // Base64url(SHA256(verifier))
}
```

### StateData
```typescript
interface StateData {
  state: string;            // 64-char hex random
  createdAt: number;        // Timestamp
  expiresAt: number;        // 10 minutes later
}
```

## Service Classes

### GoogleOAuthService

```typescript
class GoogleOAuthService {
  // Start OAuth flow - returns auth URL and PKCE data
  initiateAuthorization(): { authorizationUrl: string; state: string }
  
  // Exchange authorization code for tokens
  exchangeCodeForToken(code: string, state: string): Promise<OAuthToken>
  
  // Refresh expired access token
  refreshToken(refreshToken: string): Promise<OAuthToken>
  
  // Get user email and profile
  getUserInfo(accessToken: string): Promise<{ email: string; name: string }>
  
  // Revoke token (logout)
  revokeToken(token: string): Promise<void>
  
  // Validate token
  isTokenValid(accessToken: string): Promise<boolean>
}
```

### MicrosoftOAuthService

```typescript
class MicrosoftOAuthService {
  // Same interface as GoogleOAuthService
  initiateAuthorization(): { authorizationUrl: string; state: string }
  exchangeCodeForToken(code: string, state: string): Promise<OAuthToken>
  refreshToken(refreshToken: string): Promise<OAuthToken>
  getUserInfo(accessToken: string): Promise<{ email: string; name: string }>
  revokeToken(token: string): Promise<void>
  isTokenValid(accessToken: string): Promise<boolean>
}
```

## Using Credentials in Your Code

### Get Stored Credential

```typescript
import { emailCredentialStore } from '@/config/email-config';

// Get by provider_email
const credential = emailCredentialStore.getOAuthCredential('google_user@gmail.com');

// Get by provider only
const googleCreds = emailCredentialStore.getOAuthCredentialsByProvider('google');

// Check if exists
if (emailCredentialStore.hasOAuthCredential('google_user@gmail.com')) {
  // Credential exists
}
```

### Decrypt Token

```typescript
import { decrypt } from '@/utils/crypto';

const credential = emailCredentialStore.getOAuthCredential('google_user@gmail.com');
const token = decrypt(credential.oauthToken.accessToken);
const refreshToken = decrypt(credential.oauthToken.refreshToken);
```

### Refresh Token

```typescript
import { googleOAuthService } from '@/services/oauth/google-oauth';

const credential = emailCredentialStore.getOAuthCredential('google_user@gmail.com');
const refreshToken = decrypt(credential.oauthToken.refreshToken);

const newToken = await googleOAuthService.refreshToken(refreshToken);

// Update stored credential
credential.oauthToken = newToken;
emailCredentialStore.setOAuthCredential('google_user@gmail.com', credential);
```

## Testing OAuth Flow

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Get Authorization URL
```bash
curl http://localhost:8080/auth/google/login
```

### 3. Open Authorization URL in Browser
Copy the `authorizationUrl` from response and open in browser.

### 4. Grant Permissions
User logs in with Google/Microsoft and grants permissions.

### 5. Automatic Callback
Browser automatically redirected to callback endpoint, which:
- Exchanges code for token
- Encrypts and stores credential
- Redirects to app homepage

### 6. Check Stored Credential
```bash
curl http://localhost:8080/api/email/auth/status
```

Should show:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "google",
        "email": "your-email@gmail.com",
        "expiresAt": 1770468587685
      }
    ]
  }
}
```

## Error Handling

### Common Errors

**Error 403 - Verification Required**
```
"Emailify has not completed the Google verification process"
```
Solution: Add test users to Google OAuth consent screen

**Error: redirect_uri_mismatch**
```
Redirect URI doesn't match what's registered
```
Solution: Ensure exact match in .env (including http/https and port)

**Error: invalid_state**
```
State token validation failed
```
Solution: State token expired (10 min) or mismatched - try login again

**Error: invalid_grant**
```
Authorization code already used or expired
```
Solution: Authorization code valid for only 10 minutes - try login again

## Logging

All OAuth operations logged with `[OAUTH]` prefix:

```
[OAUTH] [GOOGLE] Service initialized { clientId: '...', redirectUri: '...' }
[OAUTH] [GOOGLE] [2026-02-07T11:49:45.123Z] Authorization initiated { state: 'abc123...' }
[OAUTH] [GOOGLE] [2026-02-07T11:49:48.839Z] Authorization successful { email: 'user@gmail.com', expiresIn: 3599 }
[OAUTH] [GOOGLE] [2026-02-07T11:50:00.456Z] Token refreshed { expiresIn: 3600 }
```

## Troubleshooting

### Dev Server Port Mismatch
If dev server runs on different port than .env redirect URI:
1. Kill all Node processes: `taskkill /F /IM node.exe`
2. Update .env with correct port
3. Start fresh dev server: `pnpm dev`

### Encrypted Data Issues
If OAuth tokens appear corrupted:
1. Check ENCRYPTION_KEY in .env (must be 32-byte hex)
2. Clear credentials: `POST /api/email/auth/disconnect`
3. Re-login with provider

### Token Exchange Fails
If code exchange fails with 403/invalid_state:
1. Check authorization URL format in logs
2. Ensure state token matches (not expired)
3. Verify code not already used

## Next Steps

1. **Integrate with Email Service**: Use OAuth tokens to fetch emails via Gmail API and Microsoft Graph
2. **Token Refresh Scheduling**: Implement automatic token refresh before expiry
3. **UI Integration**: Create login buttons for Google/Microsoft
4. **Multi-Account Support**: Allow users to connect multiple email accounts
5. **Token Rotation**: Implement refresh token rotation for enhanced security

## References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth2 Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
