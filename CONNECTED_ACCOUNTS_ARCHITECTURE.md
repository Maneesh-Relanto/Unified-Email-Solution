# Connected Accounts & Persistence Architecture Analysis

## What is "Connected Accounts"?

"Connected Accounts" in Settings refers to **email accounts that have been configured/authenticated with the app**. There are two types:

### 1. **OAuth Connected Accounts** (Google/Microsoft)
- **Where stored**: `server/data/oauth-credentials.json`
- **How it persists**: ✅ JSON file on disk - **SURVIVES server restart**
- **How accessed**: `/api/email/auth/status` (from OAuth middleware)
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

### 2. **IMAP Connected Accounts** (Gmail app password, Yahoo, Outlook manual, Rediff)
- **Where stored**: ❌ **IN MEMORY ONLY** - `emailCredentialStore.credentials` Map
- **How it persists**: ❌ **LOST on server restart** - No file storage!
- **How accessed**: `/api/email/configured` → `emailCredentialStore.listAccounts()`
- **What's stored**:
  ```typescript
  Map<email, EmailCredentials>
  ```

## The Critical Problem: IMAP Accounts Not Persistent!

### Current Flow:
```
1. User adds Gmail account with app password
   ↓
2. Backend adds to emailCredentialStore (in-memory Map)
   ↓
3. User sees it in Settings
   ↓
4. Server restarts (process dies, pnpm crashes, etc)
   ↓
5. emailCredentialStore Map cleared ❌ ACCOUNT LOST!
```

### What We're Missing:
This is what "tons of developers have solved" - **Database persistence of IMAP credentials**.

Other email apps use:
- **Local**: SQLite database with encryption
- **Cloud**: MongoDB/PostgreSQL with encrypted fields  
- **Security**: Hardware vault or secret management service

## Email Format Mismatch Issue

### The Error: "email.from.split is not a function"

**Root Cause**: Different email sources return different formats.

```typescript
// Gmail OAuth returns:
{
  from: {
    name: "John Doe",
    email: "john@gmail.com"
  }
}

// Outlook OAuth returns:
{
  from: {
    name: "John Doe", 
    email: "john@outlook.com"
  }
}

// IMAP (from mailparser) returns:
{
  from: "John Doe <john@gmail.com>"  // STRING format!
}
```

### Where the Error Happens (UnifiedInbox.tsx):
```typescript
email.from.split('<')[0]  // ❌ Fails if from is object, not string
```

## Data Flow Architecture

```
UnifiedInbox Component
    │
    ├─→ /api/email/oauth/all  (OAuth emails)
    │   └─→ Decrypts tokens from oauth-credentials.json
    │   └─→ Calls Gmail/Microsoft API
    │   └─→ Returns: { from: { name, email } } ✅ CONSISTENT
    │
    └─→ /api/email/all        (IMAP emails)
        └─→ Reads from emailCredentialStore
        └─→ Calls IMAP providers
        └─→ Returns: { from: "Name <email>" } ⚠️ INCONSISTENT
```

## Solution Checklist

### ✅ SHORT TERM (Fix Now)
1. **Normalize email.from format** in frontend
   - Check if it's string or object
   - Extract name/email safely
   
2. **Add console logging** to see actual data format
   - Debug what backend is actually returning

### ⏳ MEDIUM TERM (Important)
3. **Persist IMAP accounts to file** (like OAuth does)
   - Create `server/data/imap-credentials.json`
   - Save to file after adding/removing accounts
   - Load from file on startup
   
4. **Normalize backend responses**
   - All email objects use consistent format
   - Transform IMAP emails to standard format before returning

### 🎯 LONG TERM (Production)
5. **Migrate to database**
   - Use SQLite during dev, MongoDB/PostgreSQL in production
   - Encrypted credential storage
   - Audit logging for security

## Current Data Persistence Status

| Account Type | Stored Where | Persists on Restart |
|--------------|--------------|-------------------|
| OAuth (Google) | File ✅ | YES |
| OAuth (Microsoft) | File ✅ | YES |
| IMAP (manual) | Memory ❌ | NO |

## Immediate Actions Needed

1. **Fix frontend normalization** (Line 167-171 in UnifiedInbox.tsx)
   - Add type guard for `email.from` format
   
2. **Add logging** to see actual format being returned
   - Log raw API response to understand issue
   
3. **Consider**: Should IMAP be OAuth-based?
   - Gmail IMAP = Less secure
   - Outlook IMAP = Requires app password
   - Why not use OAuth for all? (Better UX, more secure)

## Code Places to Review

### Backend (Data Generation)
- `server/services/email/oauth-provider.ts` - Returns `{ from: { name, email } }`
- `server/services/email/imap-provider.ts` - Returns `{ from: "Name <email>" }`
- `server/routes/email.ts` - `/api/email/oauth/*` vs `/api/email/*`

### Frontend (Data Consumption)
- `client/pages/UnifiedInbox.tsx` - Line 167: `email.from.split('<')`
- Assumes `from` is always a string!

### Persistence
- `server/data/oauth-credentials.json` - ✅ Persisted
- No equivalent for IMAP - ❌ Missing!
