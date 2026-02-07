# OAuth Email Fetcher Service

Complete OAuth2 email fetching implementation using Gmail API and Microsoft Graph API.

## Status

✅ **Production-Ready**
- Google Gmail API integration
- Microsoft Graph API integration  
- Automatic token refresh
- Email parsing and normalization
- Multi-account support

## Architecture

### Email Fetching Flow

```
User OAuth Authenticated
         ↓
  OAuth Credential Stored (encrypted)
         ↓
  EmailProviderFactory creates OAuthEmailProvider
         ↓
  Google Gmail API / Microsoft Graph API
         ↓
  Raw email responses parsed into ParsedEmail
         ↓
  Normalized emails returned to client
```

### Key Components

**OAuthEmailProvider** (`server/services/email/oauth-provider.ts`)
- Implements EmailProvider interface
- Supports Gmail (Google) and Outlook (Microsoft)
- Handles token refresh automatically
- Parses email responses from APIs

**EmailProviderFactory** (`server/services/email/index.ts`)
- Creates appropriate provider based on credentials
- Supports IMAP, OAuth, and future Graph API
- Factory pattern for extensibility

**Email Service Integration** (`server/routes/email.ts`)
- New OAuth-specific endpoints
- Token management
- Error handling

## API Endpoints

### Fetch Emails from OAuth Account

```
GET /api/email/oauth/provider/:email

Query Parameters:
  limit=20          - Number of emails to fetch (default: 20)
  unreadOnly=true   - Only unread emails (default: false)

Response:
{
  "success": true,
  "provider": "gmail",
  "email": "user@gmail.com",
  "count": 5,
  "emails": [
    {
      "id": "gmail_abc123",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "subject": "Welcome!",
      "preview": "This is the email preview text...",
      "date": "2026-02-07T12:00:00Z",
      "read": false,
      "providerName": "Gmail (OAuth)"
    }
  ]
}
```

### Fetch from All OAuth Accounts

```
GET /api/email/oauth/all

Query Parameters:
  limit=20          - Emails per account (default: 20)
  unreadOnly=true   - Only unread (default: false)

Response:
{
  "success": true,
  "count": 10,
  "accounts": 2,
  "errors": ["account2@example.com: Token expired"],
  "emails": [...]
}
```

## Features

### Automatic Token Refresh

When access token is about to expire (within 5 minutes), the service automatically:
1. Detects expiration time
2. Uses refresh token to get new access token
3. Updates stored credential
4. Continues fetching without interruption

```
[OAuth Email Provider] Token expired, refreshing...
[OAuth Email Provider] Token refreshed successfully
```

### Email Parsing

**Gmail API Response** → ParsedEmail
- Decodes base64url-encoded message bodies
- Extracts headers (From, Subject, Date)
- Separates text/plain and text/html content
- Extracts preview (first 200 chars)
- Detects read/unread status from labels

**Microsoft Graph Response** → ParsedEmail
- Uses native JSON response format
- Extracts sender, subject, received date
- Combines bodyPreview and body.content
- Handles both plaintext and HTML
- Uses isRead property directly

### Multi-Provider Support

```typescript
// Provider auto-detection
if (credential.provider === 'gmail') {
  // Use Gmail API endpoints
} else {
  // Use Microsoft Graph endpoints
}
```

## Usage Examples

### In React Component

```typescript
// Fetch emails from authenticated Google account
const response = await fetch('/api/email/oauth/provider/user@gmail.com?limit=20');
const data = await response.json();

if (data.success) {
  setEmails(data.emails);
  console.log(`Loaded ${data.count} emails from ${data.provider}`);
}
```

### Fetch from All Connected Accounts

```typescript
const response = await fetch('/api/email/oauth/all?limit=10');
const data = await response.json();

const allEmails = data.emails; // Combined from all accounts
const accountCount = data.accounts;
const errors = data.errors; // Any accounts that failed
```

### In Backend (TypeScript)

```typescript
import { EmailProviderFactory } from '@/services/email/index';

// Get stored OAuth credential
const credential = emailCredentialStore.getOAuthCredential('google_user@gmail.com');

// Create provider instance
const provider = EmailProviderFactory.createProvider({
  providerType: 'oauth',
  email: credential.email,
  provider: credential.provider, // 'gmail' or 'outlook'
  oauthConfig: {
    clientId: '',
    clientSecret: '',
    accessToken: credential.oauthToken.accessToken,
    refreshToken: credential.oauthToken.refreshToken,
    expiresAt: credential.oauthToken.expiresAt,
  },
});

// Authenticate and fetch
await provider.authenticate();
const emails = await provider.fetchEmails({ limit: 20 });
```

## Gmail API Integration

### Endpoints Used

```
GET https://www.googleapis.com/gmail/v1/users/me/messages
  - List emails with query support
  - Parameters: q (query), maxResults (limit)

GET https://www.googleapis.com/gmail/v1/users/me/messages/{id}
  - Get full message with headers and body
  - Parameters: format=full

POST https://www.googleapis.com/gmail/v1/users/me/messages/{id}/removeLabels
  - Mark email as read (remove UNREAD label)

GET https://www.googleapis.com/oauth2/v2/userinfo
  - Get user profile for verification
```

### Query Examples

```
// Unread emails
q: "is:unread"

// Emails since date
q: "after:2026-02-01"

// Combined
q: "in:inbox is:unread after:2026-02-01"
```

### Response Parsing

```typescript
// Gmail returns base64url-encoded content
const decoded = Buffer.from(
  body.data.replace(/-/g, '+').replace(/_/g, '/'),
  'base64'
).toString('utf-8');
```

## Microsoft Graph API Integration

### Endpoints Used

```
GET https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages
  - List inbox emails
  - Parameters: $top (limit), $filter (conditions), $orderby

GET https://graph.microsoft.com/v1.0/me
  - Get user profile
```

### Query/Filter Examples

```
// Unread emails
$filter=isRead eq false

// Combined with ordering
$top=20&$filter=isRead eq false&$orderby=receivedDateTime desc
```

## Security Considerations

### Token Storage

- Access tokens and refresh tokens are **encrypted at storage** using AES-256-CBC
- Encryption key from environment variable (32-byte hex)
- Stored in `emailCredentialStore` with format: `provider_email`

### Token Refresh

- Tokens automatically refreshed before expiration (5-min buffer)
- Old refresh token replaced with new one from API response
- Failed refresh triggers authentication error

### API Requests

- All requests use Bearer token authentication
- HTTPS in production (http only for localhost dev)
- Requests timeout after 30 seconds
- Error handling catches and logs all failures

## Error Handling

### Common Scenarios

**Token Expired**
```json
{
  "error": "Authentication failed",
  "message": "Could not authenticate with OAuth provider. Your token may have expired."
}
```

**Credential Not Found**
```json
{
  "error": "OAuth credential not found",
  "message": "No OAuth credential found for: user@example.com. Please authenticate first..."
}
```

**API Error**
```json
{
  "error": "Failed to fetch OAuth emails",
  "message": "Invalid authorization header"
}
```

### Logging

All operations logged with `[OAuth Email Provider]` prefix:

```
[OAuth Email Provider] Initialized for gmail (user@gmail.com)
[OAuth Email Provider] Authenticated successfully: user@gmail.com
[OAuth Email Provider] Token expired, refreshing...
[OAuth Email Provider] Token refreshed successfully
[OAuth Email Provider] Fetched 5 Gmail emails
```

## Testing

### Prerequisite: OAuth Authentication

1. Navigate to `/auth/google/login` or `/auth/microsoft/login`
2. Authenticate with provider
3. Grant permissions
4. Callback stores encrypted credential

### Test Email Fetching

```bash
# After authenticating:
curl http://localhost:8080/api/email/oauth/provider/your-email@gmail.com?limit=5

# Fetch from all connected accounts:
curl http://localhost:8080/api/email/oauth/all?limit=10&unreadOnly=true
```

### PowerShell Test Script

```powershell
# Get authorization URL
$auth = curl http://localhost:8080/auth/google/login | ConvertFrom-Json
Write-Host $auth.data.authorizationUrl

# After authenticating manually in browser:
$emails = curl http://localhost:8080/api/email/oauth/provider/your-email@gmail.com | ConvertFrom-Json
Write-Host "Got $($emails.count) emails"
```

## Limitations & Future Improvements

### Current Limitations

- In-memory credential storage (lost on server restart)
- No email categorization/labeling
- No email search interface
- No draft/sent folder support
- Limited to INBOX folder

### Future Enhancements

1. **Persistent Storage** - Save credentials to database
2. **Folder Support** - Fetch from any folder (Sent, Drafts, etc.)
3. **Search** - Full-text email search
4. **Sync** - Incremental sync instead of full fetch
5. **Attachments** - Full attachment support
6. **Threading** - Email conversation grouping
7. **Web UI** - Interactive email viewer
8. **Notifications** - Real-time email alerts
9. **Filters** - Custom email filters
10. **Multiple Providers** - Yahoo, ProtonMail support

## Architecture Diagrams

### Token Lifecycle

```
User Logs In
    ↓
OAuth Provider Issues Tokens
    ↓
Tokens Encrypted & Stored
    ↓
Email Fetcher Uses Access Token
    ↓
Token Expires (within 5 min buffer detected)
    ↓
Refresh Token Used to Get New Access Token
    ↓
New Token Stored
    ↓
Resume Email Fetching
```

### Email Fetch Pipeline

```
GET /api/email/oauth/provider/:email
    ↓
getOAuthEmails Handler
    ↓
Look Up Credential
    ↓
Create OAuthEmailProvider
    ↓
Authenticate (refresh if needed)
    ↓
Gmail or Microsoft API Call
    ↓
Parse Raw Response
    ↓
Return ParsedEmail[]
```

## Files Modified

- `server/services/email/oauth-provider.ts` - NEW: OAuth email provider
- `server/services/email/index.ts` - Updated: Factory supports OAuth
- `server/routes/email.ts` - Updated: New OAuth endpoints
- `server/index.ts` - Updated: Register oauth email routes
- `server/services/oauth/google-oauth.ts` - Updated: Export singleton
- `server/services/oauth/microsoft-oauth.ts` - Updated: Export singleton
- `server/routes/auth.ts` - Updated: Use exported singletons

## References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Microsoft Graph API Documentation](https://learn.microsoft.com/graph/api)
- [Email Provider Interface](../services/email/types.ts)
