# 🚀 Quick Start Guide - Emailify

Get Emailify running on your local machine in **15 minutes**.

---

## 📋 Prerequisites

Check you have these installed:

```bash
node --version    # Should be v18 or higher
pnpm --version    # Should be v8 or higher
```

If not installed:
- **Node.js**: Download from [nodejs.org](https://nodejs.org/)
- **pnpm**: Install with `npm install -g pnpm`

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/maneeshthakur/unified-email-solution.git
cd unified-email-solution

# Install all dependencies (this takes ~2 minutes)
pnpm install
```

### Step 2: Configure Environment Variables

```bash
# Copy the environment template
# Windows:
copy .env.example confidential\.env

# Linux/Mac:
cp .env.example confidential/.env
```

Now edit `confidential/.env` with your favorite editor. You need to fill in:

1. **Google OAuth Credentials** (for Gmail)
2. **Microsoft OAuth Credentials** (for Outlook)
3. **Encryption Key** (for security)

**Don't have OAuth credentials yet?** Jump to [Step 2a: Get OAuth Credentials](#step-2a-get-oauth-credentials) below.

**Already have credentials?** Paste them into `confidential/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

MICROSOFT_CLIENT_ID=your-app-id-here
MICROSOFT_CLIENT_SECRET=your-secret-here
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/microsoft/callback

ENCRYPTION_KEY=generate-this-see-below
```

**Generate Encryption Key:**

```bash
# Run this command in your terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and paste it as ENCRYPTION_KEY in confidential/.env
```

### Step 3: Start the Server

```bash
pnpm dev
```

✅ **Server should start at:** http://localhost:8080

You should see:
```
[dotenv@17.2.1] injecting env (9) from confidential\.env
VITE v7.1.2  ready in 879 ms
➜  Local:   http://localhost:8080/
```

That **(9)** means 9 environment variables were loaded successfully!

---

## 🔐 Step 2a: Get OAuth Credentials

If you don't have OAuth credentials yet, follow these guides:

### For Gmail (Google OAuth)

**Time:** ~5 minutes

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **"Select a project"** → **"New Project"**
   - Name: `Emailify`
   - Click **Create**
3. In the left sidebar: **APIs & Services** → **Library**
   - Search for **"Gmail API"**
   - Click it → Click **Enable**
4. In the left sidebar: **APIs & Services** → **Credentials**
5. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
6. If prompted, configure consent screen first:
   - User Type: **External**
   - App name: **Emailify**
   - User support email: Your email
   - Add your email to **Test users**
   - Click **Save and Continue** through all steps
7. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Emailify Dev`
   - Authorized redirect URIs → Click **+ ADD URI**:
     ```
     http://localhost:8080/auth/google/callback
     ```
   - Click **Create**
8. **Copy the Client ID and Client Secret** → Add to `confidential/.env`

### For Outlook (Microsoft OAuth)

**Time:** ~5 minutes

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"Azure Active Directory"** (or **"Microsoft Entra ID"**)
3. In the left menu: **App registrations** → **+ New registration**
   - Name: `Emailify`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URI: `http://localhost:8080/auth/microsoft/callback`
   - Click **Register**
4. On the Overview page, **Copy the Application (client) ID** → Add to `confidential/.env` as `MICROSOFT_CLIENT_ID`
5. In the left menu: **Certificates & secrets** → **+ New client secret**
   - Description: `Emailify Dev`
   - Expires: Choose duration (e.g., 6 months)
   - Click **Add**
   - **⚠️ IMPORTANT:** Copy the **Value** immediately (shown only once!) → Add to `confidential/.env` as `MICROSOFT_CLIENT_SECRET`
6. In the left menu: **API permissions** → **+ Add a permission**
   - Choose **Microsoft Graph** → **Delegated permissions**
   - Search and check these permissions:
     - ✅ `Mail.Read`
     - ✅ `Mail.Send`
     - ✅ `offline_access`
   - Click **Add permissions**

---

## 🎯 Using the Application

### 1. Open the App

Visit: http://localhost:8080

### 2. Verify OAuth Configuration

- Go to **Settings** page
- At the top, you should see:
  ```
  ✅ All OAuth providers are configured and ready to use
  
  📧 Gmail OAuth: Ready
  📬 Outlook OAuth: Ready
  ```

### 3. Connect Your First Email Account

**Option A: Gmail**
1. Click **Settings** → **Add Account** tab
2. Select **Gmail**
3. Click **"Sign in with Google"**
4. Choose your Google account
5. Click **"Allow"** to grant permissions
6. ✅ You'll be redirected back with account connected!

**Option B: Outlook**
1. Click **Settings** → **Add Account** tab
2. Select **Outlook**
3. Click **"Sign in with Microsoft"**
4. Sign in with your Microsoft account
5. Click **"Yes"** to grant permissions
6. ✅ You'll be redirected back with account connected!

### 4. View Your Unified Inbox

- Go to **Unified Inbox** or **Home**
- All emails from your connected accounts appear in one place!
- Click any email to read it
- Mark as read/unread
- Search across all accounts

---

## 🔍 Verify Everything Works

### ✅ Checklist

Run through this checklist to ensure everything is working:

- [ ] Server starts without errors
- [ ] See `injecting env (9)` in terminal (not `(0)`)
- [ ] Can access http://localhost:8080
- [ ] Settings page shows OAuth providers as "Ready"
- [ ] Can click "Sign in with Google" without errors
- [ ] Google OAuth redirects to consent screen
- [ ] After granting permission, redirected back to app
- [ ] Account appears in "Connected Accounts"
- [ ] Can see emails in Unified Inbox

---

## 🐛 Troubleshooting

### Issue: OAuth shows "Not Configured"

**Symptom:** Settings page shows ❌ for Gmail/Outlook

**Fix:**
1. Check `confidential/.env` has values (not empty)
2. Restart dev server: `Ctrl+C` then `pnpm dev`
3. Must see `injecting env (9)` on startup

### Issue: Google Error "Missing required parameter: client_id"

**Symptom:** Clicking "Sign in with Google" shows Google error page

**Fix:**
1. Verify `GOOGLE_CLIENT_ID` in `confidential/.env` is not empty
2. Restart server completely: `Ctrl+C` then `pnpm dev`
3. Check you see `injecting env (9)` not `injecting env (0)`

### Issue: "Redirect URI mismatch"

**Symptom:** OAuth provider says redirect URI doesn't match

**Fix:**
- **Google Cloud Console:** Add `http://localhost:8080/auth/google/callback`
- **Azure Portal:** Add `http://localhost:8080/auth/microsoft/callback`
- Make sure there's no trailing slash
- Must match exactly (including http vs https)

### Issue: Port 8080 already in use

**Symptom:** Server fails to start, says port in use

**Fix:**
```bash
# Windows: Kill process on port 8080
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Linux/Mac: Kill process on port 8080
lsof -ti:8080 | xargs kill

# Or use a different port:
$env:PORT='3000'  # Windows
export PORT=3000  # Linux/Mac
pnpm dev
```

### Issue: Dependencies fail to install

**Symptom:** `pnpm install` throws errors

**Fix:**
```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 Next Steps

Now that you have Emailify running:

1. **Add multiple accounts** - Connect both Gmail and Outlook
2. **Explore features** - Try searching, marking read/unread
3. **Read the docs:**
   - [OAuth Implementation Details](./docs/OAUTH_IMPLEMENTATION.md)
   - [Email Fetching Architecture](./docs/OAUTH_EMAIL_FETCHER.md)
   - [Application Architecture](./docs/ARCHITECTURE.md)
4. **Customize** - Modify the code to fit your needs
5. **Deploy** - See [Deployment Guide](./deployment/README.md)

---

## 🔒 Security Notes

- ✅ Your `confidential/.env` is **git-ignored** - it won't be committed
- ✅ OAuth tokens are **encrypted** with AES-256
- ✅ No passwords stored - OAuth handles authentication
- ✅ Tokens auto-refresh without re-login
- ⚠️ Never commit `confidential/.env` to public repos
- ⚠️ Never share your `ENCRYPTION_KEY`

---

## 💡 Tips for Development

- **Hot Reload:** The dev server auto-reloads when you change files
- **Check Logs:** Watch the terminal for OAuth events and errors
- **Browser Console:** Open DevTools to see frontend logs
- **Test Users:** Add your email as a test user in Google/Azure consent screens
- **Multiple Accounts:** You can connect multiple Gmail/Outlook accounts

---

## 🤝 Need Help?

- **Documentation:** Check [docs/](./docs/) folder
- **Issues:** File a GitHub issue with your error logs
- **Environment:** Ensure `.env` file is in `confidential/` folder, not root

---

**Last Updated:** February 11, 2026  
**Version:** 1.0.0

Happy emailing! 📧✨
