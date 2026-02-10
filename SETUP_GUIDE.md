# Environment Setup Guide

## 🔒 Secure Credential Management with `confidential/.env`

Starting from this version, Emailify uses a **confidential folder approach** for storing sensitive credentials. This provides better security and prevents accidental credential exposure.

## 📋 Quick Setup

### Step 1: Create Your Environment File

```bash
# Windows
copy .env.example confidential\.env

# Linux/Mac
cp .env.example confidential/.env
```

### Step 2: Generate Encryption Key

```bash
# Using Node.js (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Using OpenSSL
openssl rand -hex 32
```

Copy the output and paste it into `confidential/.env` as the `ENCRYPTION_KEY` value.

### Step 3: Configure OAuth Credentials

#### Google Gmail OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 Client ID (Web application)
5. Add redirect URI: `http://localhost:8080/auth/google/callback`
6. Copy Client ID and Client Secret to `confidential/.env`

See detailed guide: [docs/OAUTH_IMPLEMENTATION.md](docs/OAUTH_IMPLEMENTATION.md)

#### Microsoft Outlook OAuth

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Add redirect URI: `http://localhost:8080/auth/microsoft/callback`
5. Create client secret in "Certificates & secrets"
6. Copy Application (client) ID and secret to `confidential/.env`

See detailed guide: [docs/OAUTH_IMPLEMENTATION.md](docs/OAUTH_IMPLEMENTATION.md)

### Step 4: Verify Setup

```bash
# Check that confidential/.env exists
ls confidential/.env        # Linux/Mac
dir confidential\.env       # Windows

# Verify it's not tracked by Git
git status
# Should NOT see confidential/ in the output

# Test the application
npm test                    # Should pass all 359 tests
npm run dev                 # Should start without errors
```

## 🎯 Why `confidential/.env`?

### Traditional Approach (`.env` in root)
❌ **Risks**:
- Easy to accidentally commit `.env` to Git
- Developers might forget to add to `.gitignore`
- Credential leaks in Git history are hard to clean

### New Approach (`confidential/.env`)
✅ **Benefits**:
- **Entire folder** is gitignored (not just one file)
- Clear separation between template (`.env.example`) and actual config
- Easier to protect multiple confidential files
- Industry best practice for credential management
- Simpler onboarding (copy to confidential/)

## 📁 File Structure

```
project-root/
├── .env.example              ← Template (SAFE to commit, no secrets)
├── .gitignore                ← Includes "confidential/"
├── confidential/             ← NOT tracked by Git
│   ├── .env                  ← Your actual credentials (NEVER commit)
│   ├── README.md             ← Setup instructions
│   └── OAUTH2_SETUP_GUIDE.md ← Detailed OAuth guide (optional)
├── server/
│   └── index.ts              ← Loads confidential/.env
└── README.md
```

## 🔍 What Goes in `confidential/.env`?

### Required Variables

```env
# OAuth Credentials (REQUIRED for Google/Outlook)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret

# Encryption Key (REQUIRED for credential storage)
ENCRYPTION_KEY=your-64-character-hex-key

# Application Settings
PORT=8080
NODE_ENV=development
```

### Optional Variables

```env
# Custom redirect URIs (if not using localhost:8080)
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/microsoft/callback

# Public variables
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE=pong
```

## 🚨 Security Best Practices

### ✅ DO:
- Keep `confidential/.env` on your local machine only
- Use strong, randomly-generated encryption keys
- Rotate OAuth credentials every 90 days
- Use environment-specific credentials (dev vs prod)
- Share credentials through secure channels (1Password, LastPass)

### ❌ DON'T:
- Never commit `confidential/.env` to Git
- Never share credentials via email, chat, or screenshots
- Never use production credentials in development
- Never commit `.env` files to public repositories
- Never hardcode secrets in source code

## 🔄 Credential Rotation

### When to Rotate:
- Every 90 days (recommended)
- After team member departure
- If credentials are exposed or suspected compromise
- Before making repository public
- After security audit findings

### How to Rotate:

1. **Generate New Credentials**:
   - Google: Delete old OAuth client, create new one
   - Microsoft: Delete old secret, create new one
   - Encryption: Generate new key with crypto command

2. **Update `confidential/.env`**:
   ```bash
   # Edit the file
   nano confidential/.env      # Linux/Mac
   notepad confidential\.env   # Windows
   ```

3. **Re-encrypt Stored Data**:
   ```bash
   # If rotating encryption key, delete and re-auth
   rm server/data/oauth-credentials.json
   npm run dev
   # Re-authenticate through UI
   ```

4. **Verify**:
   ```bash
   npm test                    # Should pass
   npm run dev                 # Should work
   ```

## 👥 Team Onboarding

### New Developer Setup:

1. **Clone Repository**:
   ```bash
   git clone <repo-url>
   cd emailify
   npm install
   ```

2. **Create Confidential Environment**:
   ```bash
   copy .env.example confidential\.env
   ```

3. **Request Credentials** (from team lead):
   - Google Client ID & Secret
   - Microsoft Client ID & Secret
   - Encryption Key

4. **Paste into `confidential/.env`**

5. **Verify**:
   ```bash
   npm test
   npm run dev
   ```

## 🐛 Troubleshooting

### "Cannot find module 'confidential/.env'"

**Solution**: Create the file
```bash
copy .env.example confidential\.env
```

### "Missing GOOGLE_CLIENT_SECRET"

**Solution**: Fill in OAuth credentials in `confidential/.env`

### "confidential/.env appears in git status"

**Problem**: `.gitignore` not working

**Solution**:
```bash
# Check .gitignore contains "confidential/"
cat .gitignore | grep confidential

# If not, add it
echo "confidential/" >> .gitignore

# Remove from tracking (if already committed)
git rm -r --cached confidential/
git commit -m "Stop tracking confidential folder"
```

### "Tests fail with environment variable errors"

**Solution**: Ensure `confidential/.env` exists and has all required variables
```bash
# Verify file exists
ls confidential/.env

# Check for missing variables
cat confidential/.env | grep CLIENT_SECRET
cat confidential/.env | grep ENCRYPTION_KEY
```

## 📚 Additional Resources

- [OAuth Implementation Guide](docs/OAUTH_IMPLEMENTATION.md) - Detailed OAuth setup
- [Security Audit Report](SECURITY_AUDIT_REPORT.md) - Security findings and remediation
- [Architecture Documentation](docs/ARCHITECTURE.md) - System design
- [Privacy Policy](PRIVACY.md) - Data handling practices

## 🔗 Related Configuration Files

| File | Purpose | Git Tracked? |
|------|---------|--------------|
| `.env.example` | Template with instructions | ✅ Yes (safe) |
| `confidential/.env` | Actual credentials | ❌ No (secret) |
| `confidential/README.md` | Setup instructions | ❌ No (may contain sensitive info) |
| `.gitignore` | Git exclusion rules | ✅ Yes |
| `server/data/` | Encrypted OAuth tokens | ❌ No (gitignored) |

---

**Questions or Issues?** Open an issue on GitHub or refer to [docs/OAUTH_IMPLEMENTATION.md](docs/OAUTH_IMPLEMENTATION.md)
