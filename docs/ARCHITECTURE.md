# Connected Accounts & Persistence Architecture

## What is "Connected Accounts"?

"Connected Accounts" refers to **email accounts that have been configured/authenticated with the app**. There are two types:

### 1. **OAuth Connected Accounts** (Google/Microsoft)
- **Where stored**: `server/data/oauth-credentials.json`
- **How it persists**: ✅ JSON file on disk - **SURVIVES server restart**
- **How accessed**: `/api/email/auth/status`
- **What's stored**:
  ```json
  {
    "google_user@gmail.com": {
      "provider": "google",
      "email": "user@gmail.com",
      "oauthToken": {
        "accessToken": "encrypted_token_here",
        "refreshToken": "encrypted_token_here",
        "expiresAt": 1707000000000
      }
    }
  }
  ```

### 2. **IMAP Connected Accounts** (Gmail app password, Yahoo, Outlook, Rediff)
- **Where stored**: In-memory storage
- **How it persists**: Stored in `server/data/imap-credentials.json` on disk
- **How accessed**: `/api/email/configured`

## Data Flow Architecture

```
UnifiedInbox Component
    │
    ├─→ /api/email/oauth/all  (OAuth emails)
    │   └─→ Returns: { from: { name, email } } ✅ CONSISTENT
    │
    └─→ /api/email/oauth/provider/:email (Specific provider)
        └─→ Returns: { from: { name, email } } ✅ CONSISTENT
```

## Email Format

All email objects use consistent format:
```typescript
{
  id: string;
  from: { name: string; email: string };
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  providerName: string;
}
```

## Current Status

| Account Type | Stored Where | Persists on Restart |
|--------------|--------------|-------------------|
| OAuth (Google) | File ✅ | YES |
| OAuth (Microsoft) | File ✅ | YES |
| IMAP | File ✅ | YES |

## Security

All OAuth tokens are encrypted at rest using AES-256-CBC. Never expose refresh tokens in API responses.

See [OAUTH_IMPLEMENTATION.md](./OAUTH_IMPLEMENTATION.md) for complete OAuth setup details.

---

**Last Updated**: February 8, 2026
