# Privacy Policy for Emailify

**Last Updated:** February 10, 2026

Emailify ("we", "our", or "the application") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our unified email management application.

## 1. Overview

Emailify is a self-hosted, open-source email client that provides a unified interface for managing multiple email accounts. **Your data remains on your own server/computer and is never sent to our servers** because we don't operate any servers for user data.

## 2. Information We Collect

### 2.1 Email Account Credentials
When you connect email accounts to Emailify, we store:
- **OAuth Tokens**: For Google (Gmail) and Microsoft (Outlook) accounts, encrypted OAuth2 access and refresh tokens
- **IMAP Credentials**: For Yahoo, Rediff, and app password-based connections, encrypted username and password combinations
- **Email Metadata**: Email addresses, provider information, and connection settings

**Storage Location**: All credentials are stored locally on your device/server in:
- `server/data/oauth-credentials.json` (encrypted OAuth tokens)
- `server/data/imap-credentials.json` (encrypted IMAP credentials)

### 2.2 Email Content
- **Email Messages**: When you fetch emails, message content, attachments, headers, and metadata are temporarily processed in memory
- **Local Caching**: Emails may be cached locally for performance (cache duration: 5 minutes by default)
- **No Remote Storage**: Email content is NEVER uploaded to any third-party servers operated by Emailify

### 2.3 Application Logs
- **Console Logs**: The application generates console logs for debugging purposes
- **Error Information**: Error messages and stack traces may be logged locally
- **No Telemetry**: We do not collect usage statistics, analytics, or telemetry data

## 3. How We Use Your Information

### 3.1 Email Account Access
- **Purpose**: To authenticate with email providers and fetch your emails
- **Processing**: Credentials are decrypted only when needed to establish connections
- **OAuth Flow**: For Google/Microsoft accounts, OAuth tokens are refreshed automatically using secure OAuth2 protocols

### 3.2 Encryption
- **At-Rest Encryption**: All stored credentials are encrypted using AES-256 encryption
- **Encryption Keys**: Generated locally and stored in your environment configuration
- **Password Protection**: Your encryption key should be kept secure in your `.env` file

### 3.3 Data Retention
- **Credentials**: Stored until you explicitly disconnect an account
- **Cached Emails**: Automatically expire after 5 minutes (configurable)
- **Logs**: Stored locally until manually cleared

## 4. Data Sharing and Third Parties

### 4.1 No Data Sharing
**We do not share, sell, rent, or trade your data with any third parties.** Emailify is designed for self-hosted use, and all data remains under your control.

### 4.2 Email Provider Communication
Emailify communicates directly with your email providers:
- **Google Gmail API**: For OAuth-connected Gmail accounts
- **Microsoft Graph API**: For OAuth-connected Outlook/Microsoft accounts
- **IMAP Protocols**: For Yahoo, Rediff, and other IMAP-based providers

These communications are:
- Encrypted in transit (HTTPS/TLS)
- Subject to the respective provider's privacy policy
- Initiated only by you when fetching emails

### 4.3 Third-Party Services
The application may make requests to:
- **OAuth Authorization Servers**: Google and Microsoft OAuth endpoints for authentication
- **IMAP Servers**: Your email provider's IMAP servers for email retrieval

## 5. Your Data Rights

### 5.1 Access and Control
You have complete control over your data:
- **View Credentials**: Access stored credential files (encrypted format) in `server/data/`
- **Delete Accounts**: Disconnect accounts through the application UI or by deleting credential files
- **Export Data**: All data is stored in JSON format and can be exported manually

### 5.2 Right to Deletion
To delete your data:
1. **Disconnect Accounts**: Use the application UI to disconnect all email accounts
2. **Delete Credential Files**: Remove files in `server/data/` directory
3. **Clear Cache**: Cached emails automatically expire or can be cleared by restarting the application
4. **Uninstall**: Delete the application installation directory

### 5.3 Data Portability
All data is stored in standard formats:
- **Credentials**: JSON files (encrypted)
- **Configuration**: `.env` files
- **Emails**: Standard email formats (RFC 5322)

## 6. Security Measures

### 6.1 Encryption
- **AES-256**: Industry-standard encryption for credential storage
- **TLS/HTTPS**: All network communications use encrypted protocols
- **Secure Token Handling**: OAuth tokens are never logged or exposed in plain text

### 6.2 Best Practices
We recommend:
- **Secure `.env` File**: Protect your encryption keys
- **Regular Updates**: Keep Emailify updated with security patches
- **Access Control**: Restrict access to your server/computer running Emailify
- **Firewall Rules**: Limit network access to necessary ports only

### 6.3 Known Limitations
- **Console Logging**: Development versions may log sensitive information; use production builds for sensitive environments
- **No Rate Limiting**: Current version does not implement rate limiting (planned for future releases)
- **No CSRF Protection**: Current version lacks CSRF tokens (under development)

## 7. Children's Privacy

Emailify is not directed at children under 13 years of age. We do not knowingly collect information from children. If you are a parent/guardian and believe your child has provided information, please contact us to have it deleted.

## 8. International Users

### 8.1 Self-Hosted Nature
Since Emailify is self-hosted:
- **No Cross-Border Transfers**: Data is not transferred across borders by us
- **Your Responsibility**: You control where your server/computer is located
- **Email Provider Rules**: Subject to your email provider's data residency policies

### 8.2 GDPR Compliance (EU Users)
Under GDPR, you have rights to:
- **Access**: View what data is stored (check `server/data/` directory)
- **Rectification**: Update credentials through the UI
- **Erasure**: Delete accounts and data as described in Section 5.2
- **Portability**: Export data in JSON format
- **Object to Processing**: You can stop using Emailify at any time

### 8.3 CCPA Compliance (California Users)
Under CCPA, you have rights to:
- **Know**: What personal information is collected (see Section 2)
- **Delete**: Request deletion of personal information (see Section 5.2)
- **Opt-Out**: Since we don't sell data, opt-out is not applicable
- **Non-Discrimination**: No discrimination for exercising your rights

## 9. Cookies and Tracking

### 9.1 No Cookies
Emailify does not use cookies for tracking purposes.

### 9.2 Session Storage
- **Browser Storage**: May use browser localStorage/sessionStorage for:
  - Theme preferences (light/dark mode)
  - UI state (sidebar collapsed/expanded)
  - Session authentication tokens
- **Local Only**: This data remains in your browser and is not transmitted

### 9.3 No Analytics
We do not use Google Analytics, tracking pixels, or any third-party analytics services.

## 10. Changes to This Privacy Policy

### 10.1 Notification of Changes
We may update this Privacy Policy from time to time. Changes will be:
- **Posted**: Updated policy committed to the GitHub repository
- **Dated**: "Last Updated" date at the top will be changed
- **Versioned**: Available in Git history for review

### 10.2 Your Continued Use
Continued use of Emailify after changes constitutes acceptance of the updated policy.

## 11. Open Source Transparency

### 11.1 Code Review
As an open-source project:
- **Full Transparency**: All code is available on GitHub for review
- **Community Audits**: Security researchers can audit our encryption and data handling
- **Issue Reporting**: Security vulnerabilities can be reported via GitHub Issues

### 11.2 No Hidden Data Collection
You can verify through code inspection that:
- No external tracking servers are contacted
- No telemetry data is collected
- All data stays local to your installation

## 12. Contact Information

### 12.1 Questions and Concerns
For privacy-related questions:
- **GitHub Issues**: [Repository Issues Page](https://github.com/yourusername/emailify/issues)
- **Security Issues**: Please report security vulnerabilities privately through GitHub Security Advisories

### 12.2 Data Controller
As a self-hosted application:
- **You are the data controller**: You control how data is processed
- **We are software providers**: We provide the tools, you control the data
- **Your Responsibilities**: Compliance with local laws is your responsibility as the operator

## 13. Legal Basis for Processing (GDPR)

For EU users, our legal basis for processing is:
- **Consent**: You explicitly connect email accounts
- **Contract**: Processing is necessary to provide the email aggregation service
- **Legitimate Interests**: Caching for performance optimization

## 14. Data Breach Notification

### 14.1 Self-Hosted Responsibility
Since data is stored on your infrastructure:
- **You are responsible**: For monitoring and detecting breaches on your server
- **Notification Obligations**: Follow your local laws regarding breach notification
- **Our Commitment**: We will promptly disclose any vulnerabilities discovered in the codebase

### 14.2 Security Vulnerability Disclosure
If we discover security vulnerabilities:
- **GitHub Security Advisory**: Published on the repository
- **Patch Release**: Security patches released with migration guide
- **CVE Assignment**: Critical vulnerabilities will receive CVE identifiers

## 15. Disclaimer

Emailify is provided "AS IS" without warranties. While we implement security best practices:
- **Your Responsibility**: Secure your server, encryption keys, and access controls
- **Email Provider Policies**: You remain subject to your email providers' terms and policies
- **Infrastructure Security**: We are not responsible for vulnerabilities in your hosting environment

---

## Summary: Your Data, Your Control

**Key Takeaways**:
✅ All data stored locally on your server  
✅ End-to-end encryption for credentials  
✅ No third-party tracking or analytics  
✅ Open-source and auditable  
✅ You control data retention and deletion  
✅ Direct communication with email providers only  
✅ GDPR and CCPA compliant by design  

**Questions?** Open an issue on GitHub or review our [Security Documentation](docs/SECURITY.md).
