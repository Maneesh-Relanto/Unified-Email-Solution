# Documentation

This folder contains comprehensive developer documentation for the Emailify unified email client.

## 🚀 Getting Started

**New Developers Start Here:**

- **[../QUICK_START.md](../QUICK_START.md)** - ⭐ **Complete step-by-step setup guide** (15 minutes from clone to running app)

## Setup & Configuration

- **[OAUTH_IMPLEMENTATION.md](./OAUTH_IMPLEMENTATION.md)** - Complete OAuth2 authentication setup for Google, Microsoft, Yahoo, and Rediff email providers
- **[OAUTH_EMAIL_FETCHER.md](./OAUTH_EMAIL_FETCHER.md)** - Email API implementation and multi-provider email fetching architecture

## Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Connected accounts architecture, data persistence, and storage patterns
- **[ERROR_HANDLING.md](./ERROR_HANDLING.md)** - Error handling implementation, recovery strategies, and best practices

## Supporting Documentation

- **[../config/README.md](../config/README.md)** - Build configuration, tooling, and customization
- **[../deployment/README.md](../deployment/README.md)** - Production deployment options and hosting guides  
- **[../server/services/email/README.md](../server/services/email/README.md)** - Email service architecture and provider details

## For Public Use

All documentation in this folder is **included in the public repository**. These files provide the technical reference needed for developers to:

- Set up OAuth credentials for email providers
- Understand the authentication and email fetching flow
- Extend the email service with additional providers
- Implement error recovery in their own integrations
- Deploy Emailify to production environments

---

**Note**: Internal development notes, process documentation, and feature roadmaps are kept in `../.confidential/` and explicitly excluded from version control to keep the public repository clean and focused on developer-facing documentation.

---

**Last Updated**: February 11, 2026
