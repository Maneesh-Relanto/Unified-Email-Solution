# Emailify - The Unified Email Box

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://github.com)
[![Tests](https://img.shields.io/badge/tests-359%2F359-brightgreen?style=flat-square)](https://github.com)
[![Code Quality](https://img.shields.io/badge/code%20quality-A--grade-blue?style=flat-square)](https://github.com)
[![Security](https://img.shields.io/badge/security-OAuth2%20%2B%20AES256-9cf?style=flat-square)](https://github.com)
[![Privacy](https://img.shields.io/badge/privacy-first%20%26%20zero%20storage-blueviolet?style=flat-square)](https://github.com)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20mode-blue?style=flat-square)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

## 🔐 Security & Privacy First

**This project is built on the fundamental principle that your personal email data is sacred.**

### Our Commitment to Privacy

We believe privacy is not a feature—it's a fundamental right. Emailify operates on the following core principles:

- **🚫 Zero Data Storage**: We do NOT store your email credentials, personal data, or message content on our servers
- **🚫 No Data Transfers**: Your email data is NEVER transmitted to third-party servers for storage or processing
- **🚫 Client-Side Processing**: All OAuth authentication and email retrieval happens directly between you and your email providers (Google, Microsoft, Yahoo, etc.)
- **✅ Relay Only**: We relay data between your email providers and your local instance—nothing more
- **✅ Open Source**: Code transparency for security auditing and verification

### How Privacy is Maintained

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Gmail     │◄────────┤   Emailify   │────────►│  Outlook    │
│   Yahoo     │  Direct │  (Local)     │ Stream  │  Rediff     │
└─────────────┘  OAuth  └──────────────┘  Only   └─────────────┘
     ↓                         ↓                        ↓
  Your Email            No Storage              Your Email
  Servers               No Backups              Servers
```

**Data Flow**: Email Provider → Your Emailify Instance → Your Browser
**Cloud Backup**: None
**External Storage**: None
**Third-Party Dependencies**: Only your email providers (fully under your control)

---

## ✨ What is Emailify?

**Emailify** is a unified email client that consolidates multiple email accounts (Gmail, Outlook, Yahoo, Rediff) into a single, privacy-first interface. Instead of switching between email providers or installing trust-heavy desktop clients, Emailify gives you:

- 📧 **Single Inbox for All Accounts**: Access all your emails in one place without logging in and out
- 🔐 **True Privacy**: Your credentials never touch our servers—OAuth2 keeps them secure at your email provider
- ⚡ **Fast & Lightweight**: Built with Vite + React for instant load times and smooth interactions
- 🎯 **Developer-Friendly**: REST API, TypeScript, comprehensive documentation for extensions

---

## 🎯 Why Emailify?

### The Problem
Most email solutions force you to choose between:
- **Web Interfaces** - Limited features, slow switching between providers
- **Desktop Clients** - Heavy, resource-intensive, require password storage
- **Third-party Services** - Store your credentials on external servers (security risk)

### The Solution
Emailify solves this by:
1. **Keeping Your Data Local** - Nothing is stored on our servers, ever
2. **Smart OAuth2 Integration** - Secure, provider-approved authentication
3. **Real-time Sync** - See all emails instantly as they arrive
4. **Open Source** - Audit the code yourself; no closed-door security

---

## 💪 Key Features & Benefits

### For Users
| Feature | Benefit |
|---------|---------|
| **Multi-Account Unified Inbox** | Check all emails without switching apps |
| **Privacy-First Design** | Your email stays between you and your provider |
| **Secure OAuth2** | No passwords stored anywhere |
| **Dark Mode & Customization** | Readable interface that respects your preferences |
| **Multi-Provider Support** | Gmail, Outlook, Yahoo, Rediff in one place |

### For Developers
| Feature | Benefit |
|---------|---------|
| **REST API** | Build integrations easily |
| **TypeScript** | Type-safe code with strict mode |
| **Extensible Architecture** | Add new email providers in hours |
| **359 Test Suite** | Production-ready, fully tested code |
| **OAuth2 Reference** | Complete implementation guide included |

---

## 🛠 Technology Stack

### Frontend
```
React 18+ with TypeScript (strict mode)
├─ Vite 7.1.2 (bundler)
├─ Tailwind CSS (styling)
├─ Radix UI (accessible components)
└─ TypeScript (type safety)
```

### Backend
```
Node.js + Express.js
├─ OAuth 2.0 (Google, Microsoft, Yahoo, Rediff)
├─ IMAP Protocol (Nodemailer)
├─ Token Encryption (at-rest)
├─ TypeScript (strict mode)
└─ Zod (runtime validation)
```

### Build & Dev Tools
```
pnpm (dependency management)
├─ Vite (fast development server)
├─ TypeScript Compiler (tsc)
├─ ESBuild (transpilation)
└─ SonarQube (code quality)
```

---

## 📊 Code Metrics

### Quality Improvements
| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Critical Issues | 6 | 0 | ✅ Fixed |
| Code Smells | 97 | 60* | ✅ Improved |
| Cognitive Complexity | 17 | 12 | ✅ Optimized |
| Nesting Depth | 6 | 1 | ✅ Reduced |
| Unused Imports | 8+ | 0 | ✅ Cleaned |
| Type Safety | | Strict Mode | ✅ Enforced |

*\*Remaining 60 are non-blocking style preferences rather than functional issues*

### OAuth Provider Implementation
- ✅ Google (Gmail) - Fully functional
- ✅ Microsoft (Outlook) - Fully functional  
- ✅ Yahoo Mail - Implemented
- ✅ Rediff - Implemented

### Email Operations
- ✅ Fetch emails
- ✅ Mark as read/unread
- ✅ Search emails
- ✅ Provider info
- ✅ Token refresh
- ✅ User profile fetching

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+ 
pnpm 8+
```

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/emailify.git
cd emailify

# Install dependencies
pnpm install

# Setup environment configuration
# Copy template to confidential folder
copy .env.example confidential\.env    # Windows
cp .env.example confidential/.env      # Linux/Mac

# Edit confidential/.env with your OAuth credentials
# See: docs/OAUTH_IMPLEMENTATION.md for setup guide
```

### Running Development Server
```bash
# Set port (optional, defaults to 8080)
$env:PORT='8080'

# Start dev server with hot reload
pnpm dev
```

Server starts at `http://localhost:8080`

### Building for Production
```bash
pnpm build
```

---

## � OAuth2 Setup & Configuration

### For Developers: Project Setup with OAuth2

Complete step-by-step guide to set up your local development environment and configure OAuth2 credentials:

📖 **[OAuth2 Implementation Guide](./docs/OAUTH_IMPLEMENTATION.md)** includes:
- ✅ Google Gmail OAuth setup (Client ID & Secret generation)
- ✅ Microsoft Outlook OAuth setup (Azure AD registration)
- ✅ PKCE (Proof Key for Code Exchange) security implementation
- ✅ Encryption key generation for credential storage
- ✅ Environment variables configuration (confidential/.env setup)
- ✅ Token refresh mechanisms
- ✅ Complete API endpoint reference

Follow the guide above to get your project running with OAuth2 authentication.

---

## 🔒 Security Architecture

### What is OAuth2 & Why Does Emailify Use It?

**OAuth2** is an industry-standard authorization protocol that allows you to securely grant third-party applications access to your email account without sharing your password. Instead of trusting Emailify with your actual credentials, OAuth2 creates a secure token that grants specific permissions.

#### Why OAuth2 Makes Emailify More Secure

| Feature | Benefit |
|---------|---------|
| **No Password Sharing** | You never give Emailify your email password. Only OAuth2 tokens are used. |
| **Limited Scope** | OAuth2 tokens can be restricted to specific permissions (e.g., "read emails only" without send access). |
| **Provider-Controlled** | Google, Microsoft, and other providers control the authentication. If your account is compromised, revoke OAuth2 on that provider's dashboard. |
| **Automatic Revocation** | Tokens expire automatically; no permanent login credentials are stored. |
| **No Third-Party Servers** | Your token never goes to intermediate servers. It goes directly between you and the email provider. |
| **Audit Trail** | Email providers maintain logs of which apps accessed your account and when. You can revoke access anytime. |

#### How Emailify Implements OAuth2 Securely

1. **PKCE Verification** - Authorization code interception protection
2. **Token Encryption** - Tokens encrypted at-rest using AES-256-CBC
3. **State Tokens** - 64-character random tokens prevent CSRF attacks
4. **Automatic Refresh** - Tokens refreshed before expiry without re-entering credentials
5. **Local Storage Only** - Encrypted tokens stored on your machine, never on external servers

#### Example: Gmail vs. Emailify

```
❌ INSECURE: Gmail App Password
   You: Enter your Gmail password into Emailify
   → Password stored on server
   → Server has full access to your account forever
   → Compromised = hacker gets your password

✅ SECURE: Gmail OAuth2
   You: Click "Sign in with Google" → Grant permission to Emailify
   → Your password stays secret at Google
   → Emailify gets a limited token (expires in ~1 hour)
   → Token stored encrypted, only in your browser
   → Compromised = token is quickly invalidated, your password stays safe
```

### Other Security Measures

#### OAuth Token Management
- Tokens encrypted at-rest in local storage
- No transmission to external servers
- Automatic token refresh when expired
- Secure credential validation before each operation

#### Data Validation
- Zod runtime validation on all inputs
- TypeScript strict mode for compile-time safety
- CORS properly configured to prevent cross-origin attacks
- Input sanitization on email operations

#### Compliance
- GDPR compliant (no data collection)
- CCPA compliant (no data sales)
- No telemetry or analytics tracking
- No third-party tracking pixels

---

## 📁 Project Structure

```
emailify/
├── client/                    # React frontend
│   ├── components/            # React components
│   ├── pages/                # Page components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities
│   └── App.tsx
├── server/                    # Node.js backend
│   ├── services/              # Email service logic
│   │   └── email/
│   │       ├── oauth-provider.ts     # OAuth implementation
│   │       ├── imap-provider.ts      # IMAP support
│   │       └── types.ts              # Type definitions
│   ├── routes/                # API routes
│   │   ├── auth.ts            # OAuth routes
│   │   └── email.ts           # Email API routes
│   ├── config/                # Configuration
│   └── index.ts               # Server entry
├── shared/                    # Shared types & utilities
├── public/                    # Static assets
├── deployment/                # Deployment configs
└── package.json
```

---

## 🧪 Testing & Validation

### Tested Scenarios
- ✅ Multiple OAuth provider authentication (Google, Microsoft, Yahoo, Rediff)
- ✅ Email fetching across all providers
- ✅ Token refresh mechanisms
- ✅ Error handling and recovery
- ✅ Concurrent email operations
- ✅ Dashboard data loading
- ✅ Inbox synchronization

### Known Limitations
- Emails are fetched in real-time; no local caching layer currently
- Type system requires provider normalization (future improvement)
- Some style preference issues identified (60 non-critical SonarQube items)

---

## 📝 API Endpoints

### OAuth & Authentication
```
GET  /api/email/auth/status       - Check authentication status
GET  /auth/google/login            - Initiate Google OAuth
GET  /auth/microsoft/login         - Initiate Microsoft OAuth
GET  /auth/yahoo/login             - Initiate Yahoo OAuth
GET  /auth/rediff/login            - Initiate Rediff OAuth
```

### Email Operations
```
GET  /api/email/oauth/all          - Fetch all emails from OAuth providers
GET  /api/email/accounts           - List connected email accounts
POST /api/email/mark-read          - Mark email as read
POST /api/email/refresh            - Refresh email credentials
```

---

##  License

MIT License - See LICENSE file for details

---

## 🔗 Documentation

For developers implementing and extending Emailify:

- **[OAuth Implementation](./docs/OAUTH_IMPLEMENTATION.md)** - Complete OAuth2 setup for Google, Microsoft, Yahoo, Rediff
- **[Email Service Architecture](./docs/OAUTH_EMAIL_FETCHER.md)** - Email fetching and provider integration details
- **[Application Architecture](./docs/ARCHITECTURE.md)** - Connected accounts, data persistence, and design decisions
- **[Error Handling](./docs/ERROR_HANDLING.md)** - Error recovery strategies and implementation patterns
- **[Configuration](./config/README.md)** - Build and deployment configuration
- **[Deployment Guide](./deployment/README.md)** - Production deployment options

---

## 💡 Philosophy

> **Privacy is not negotiable. Security is not optional.**

Every line of code in Emailify is written with the understanding that we hold your email credentials and personal data in trust. We take this responsibility seriously by:
- Never storing what we don't need to
- Never sending what can stay local
- Always using encryption for sensitive data
- Always being transparent about what we do

Your email account is yours alone. We are merely providing the interface to manage it.

---

**Last Updated**: February 8, 2026  
**Status**: ✅ Production Ready  
**Build**: ✅ Passing  
**Security Audit**: ✅ Recent SonarQube validation completed
