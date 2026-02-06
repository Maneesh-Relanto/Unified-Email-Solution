# Email Service Architecture

## Overview

This is a flexible, extensible email service architecture designed to support multiple authentication methods:
- **IMAP** ✅ (Currently implemented)
- **OAuth2** 🔜 (Google, Yahoo, Outlook, etc.)
- **Microsoft Graph API** 🔜 (Outlook/Office365)
- **Other providers** 🔜 (Future)

## Architecture

```
server/
├── services/
│   ├── email/
│   │   ├── types.ts              # Interfaces and type definitions
│   │   ├── imap-provider.ts      # IMAP implementation
│   │   └── index.ts              # Provider factory
│   └── email-service.ts          # High-level service layer
├── config/
│   └── email-config.ts           # Credential storage & management
├── routes/
│   ├── email.ts                  # Email API endpoints
│   └── demo.ts                   # Demo/mock endpoints
└── index.ts                       # Express server setup
```

## Key Components

### 1. **Types** (`server/services/email/types.ts`)
Defines interfaces for:
- `EmailProvider` - Abstract interface all providers must implement
- `EmailCredentials` - Flexible credential storage for different auth types
- `ParsedEmail` - Unified email object format
- `FetchEmailsOptions` - Query options for fetching emails

### 2. **IMAP Provider** (`server/services/email/imap-provider.ts`)
Implements the `EmailProvider` interface using `node-imap`:
- Authenticate with IMAP servers
- Fetch emails with options (limit, unread only, folder, date range)
- Parse email content, attachments, etc.
- Graceful disconnection

**Supported Servers:**
- Gmail (imap.gmail.com:993)
- Yahoo (imap.mail.yahoo.com:993)
- Outlook (outlook.office365.com:993)
- Rediff (imap.rediff.com:993)

### 3. **Provider Factory** (`server/services/email/index.ts`)
Creates appropriate provider instances by type:
```typescript
const provider = EmailProviderFactory.createProvider(credentials);
```

Also provides helper methods:
- `getImapConfig(provider)` - Pre-configured IMAP settings
- `getOAuthConfig(provider)` - OAuth config templates (for future use)

### 4. **Email Service** (`server/services/email-service.ts`)
High-level API for managing multiple email accounts:
- Initialize providers with credentials
- Fetch emails from single or multiple accounts
- Caching to reduce API calls
- Multi-account coordination
- Disconnect/cleanup

```typescript
// Initialize a provider
await emailService.initializeProvider(credentials);

// Fetch emails
const emails = await emailService.fetchAllEmails({ limit: 20 });

// Get initialized accounts
const accounts = emailService.getInitializedAccounts();
```

### 5. **Credential Management** (`server/config/email-config.ts`)
In-memory credential storage with environment variable support:

**Set credentials via .env:**
```env
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

YAHOO_EMAIL=your-email@yahoo.com
YAHOO_PASSWORD=your-password

OUTLOOK_EMAIL=your-email@outlook.com
OUTLOOK_PASSWORD=your-password

REDIFF_EMAIL=your-email@rediff.com
REDIFF_PASSWORD=your-password
```

**⚠️ Security Note:** This is for development only. In production, use encrypted database storage.

### 6. **API Routes** (`server/routes/email.ts`)
REST endpoints for email operations:

- `POST /api/email/init` - Initialize providers from env credentials
- `GET /api/email/all` - Get all emails from all providers
- `GET /api/email/:emailAddress` - Get emails from specific provider
- `GET /api/email/accounts` - List initialized accounts
- `POST /api/email/cache/clear` - Clear cache
- `POST /api/email/disconnect-all` - Disconnect all providers

## How to Use

### 1. Setup Environment Variables

```env
# For IMAP
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
```

**Note for Gmail:** Generate an [app password](https://myaccount.google.com/apppasswords)

### 2. Install Dependencies

```bash
npm install
```

This installs `imap` and `mailparser` packages.

### 3. Start Server

```bash
npm run dev
```

### 4. Initialize Providers

```bash
curl -X POST http://localhost:8080/api/email/init
```

Response:
```json
{
  "success": true,
  "message": "Initialized 1 email provider(s)",
  "accounts": [
    {
      "email": "your-email@gmail.com",
      "provider": "Gmail"
    }
  ]
}
```

### 5. Fetch Emails

```bash
curl http://localhost:8080/api/email/all?limit=20
```

Response:
```json
{
  "success": true,
  "count": 20,
  "emails": [
    {
      "id": "imap-1-1675000000000",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "subject": "Hello there!",
      "preview": "This is the email preview...",
      "date": "2024-02-06T10:30:00.000Z",
      "read": false,
      "providerName": "Gmail",
      "body": "Full email body...",
      "html": "HTML version...",
      "attachments": []
    }
  ]
}
```

## Adding New Providers (OAuth, Graph API, etc.)

### Step 1: Create Provider Implementation

```typescript
// server/services/email/oauth-provider.ts
import { EmailProvider, EmailCredentials, ParsedEmail } from './types';

export class OAuthEmailProvider implements EmailProvider {
  async authenticate(): Promise<boolean> { /* ... */ }
  async fetchEmails(options): Promise<ParsedEmail[]> { /* ... */ }
  async markAsRead(emailId, read): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  getProviderInfo() { /* ... */ }
}
```

### Step 2: Register in Factory

```typescript
// server/services/email/index.ts
switch (credentials.providerType) {
  case 'oauth':
    return new OAuthEmailProvider(credentials);
  // ...
}
```

### Step 3: Use Same API

The entire `EmailService` and API routes automatically work with the new provider!

## Email Object Format

All providers return emails in this unified format:

```typescript
interface ParsedEmail {
  id: string;                      // Unique identifier
  from: {
    name: string;                  // Sender name
    email: string;                 // Sender email
  };
  subject: string;                 // Email subject
  preview: string;                 // Text preview (first 100 chars)
  date: Date;                       // Received date
  read: boolean;                    // Read status
  providerName: string;             // "Gmail", "Yahoo", etc.
  body?: string;                    // Plain text body
  html?: string;                    // HTML body
  attachments?: Array<{             // File attachments
    filename: string;
    size: number;
    contentType: string;
  }>;
}
```

## Caching

- Automatic caching with 5-minute TTL
- Each account cached separately
- Manual cache clear: `POST /api/email/cache/clear`
- Cache cleared on disconnect

## Error Handling

All APIs return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Performance Tips

1. Use `limit` parameter to fetch fewer emails
2. Use `unreadOnly=true` to fetch only unread emails
3. Cache is automatic - don't worry about frequency
4. Clear cache manually before testing rapid changes
5. Disconnect unused providers to free resources

## Future Improvements

- [ ] OAuth2 implementation for Gmail, Yahoo, Outlook
- [ ] Microsoft Graph API for Outlook
- [ ] Database storage for credentials (encrypted)
- [ ] User authentication and per-user credential isolation
- [ ] Email search and filtering
- [ ] Send/compose functionality
- [ ] Attachment download
- [ ] Email threading/conversation view
- [ ] Webhook support for real-time emails

## Security Considerations

### Current (Development Only)
- App passwords for IMAP
- Environment variables for credentials
- In-memory storage

### Future (Production)
- Encrypted database storage
- OAuth2 tokens with refresh
- Per-user isolated credentials
- HTTPS enforcement
- Rate limiting
- Audit logging

## Troubleshooting

### "Failed to authenticate"
- Check email/password (use app password for Gmail)
- Verify port and host are correct
- Check firewall/network access
- Enable "Less secure app access" if needed

### "Email mailbox empty"
- Try removing `INBOX` folder specification
- Check email account has emails
- Increase `limit` parameter

### "Connection timeout"
- Check internet connection
- Verify IMAP server is accessible
- Increase timeout in config

## References

- [node-imap documentation](https://github.com/mscdex/node-imap)
- [mailparser documentation](https://nodemailer.com/extras/mailparser/)
- [IMAP Protocol (RFC 3501)](https://tools.ietf.org/html/rfc3501)
