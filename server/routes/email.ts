/**
 * Email API Routes
 * Demonstrates using the email service with IMAP
 */

import { Request, Response } from 'express';
import { emailService } from '../services/email-service';
import { emailCredentialStore, loadCredentialsFromEnv, getImapConfigForProvider } from '../config/email-config';
import { EmailProviderFactory } from '../services/email/index';
import { z } from 'zod';

/**
 * Validation schemas
 */
const AddEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  provider: z.enum(['gmail', 'yahoo', 'outlook', 'rediff']),
});

/**
 * Initialize email providers from credentials
 * POST /api/email/init
 * 
 * Body: {
 *   "credentials": [ { providerType, email, provider, imapConfig } ]
 * }
 */
export async function initializeProviders(req: Request, res: Response) {
  try {
    loadCredentialsFromEnv();
    const storedCredentials = emailCredentialStore.getAllCredentials();

    if (storedCredentials.length === 0) {
      return res.status(400).json({
        error: 'No email credentials configured',
        message: 'Please add email accounts in settings or set environment variables',
      });
    }

    for (const credentials of storedCredentials) {
      try {
        await emailService.initializeProvider(credentials);
      } catch (error) {
        console.error(`Failed to initialize ${credentials.email}:`, error);
      }
    }

    const accounts = emailService.getInitializedAccounts();
    res.json({
      success: true,
      message: `Initialized ${accounts.length} email provider(s)`,
      accounts,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get all emails from initialized providers
 * GET /api/email/all
 * Query params: ?limit=20&unreadOnly=false
 */
export async function getAllEmails(req: Request, res: Response) {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const emails = await emailService.fetchAllEmails({
      limit,
      unreadOnly,
    });

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get emails from specific provider
 * GET /api/email/:emailAddress
 * Query params: ?limit=20&unreadOnly=false
 */
export async function getEmailsByProvider(req: Request, res: Response) {
  try {
    const { emailAddress } = req.params;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    if (!emailService.isInitialized(emailAddress)) {
      return res.status(404).json({
        error: 'Provider not initialized',
        message: `No provider found for: ${emailAddress}`,
      });
    }

    const emails = await emailService.fetchEmails(emailAddress, {
      limit,
      unreadOnly,
    });

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Fetch emails from OAuth-connected account
 * GET /api/email/oauth/provider/:email
 * Query params: ?limit=20&unreadOnly=false
 * 
 * Uses stored OAuth credentials to fetch from Gmail API or Microsoft Graph API
 */
export async function getOAuthEmails(req: Request, res: Response) {
  try {
    const { email } = req.params;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    console.log(`[OAuth Email Fetch] Requesting emails for: ${email}`);

    // Find credential in storage (could be google_email or microsoft_email)
    let credential = emailCredentialStore.getOAuthCredential(`google_${email}`);
    if (!credential) {
      credential = emailCredentialStore.getOAuthCredential(`microsoft_${email}`);
    }

    if (!credential) {
      console.error(`[OAuth Email Fetch] No credential found for: ${email}`);
      return res.status(404).json({
        error: 'OAuth credential not found',
        message: `No OAuth credential found for: ${email}. Please authenticate first at /auth/google/login or /auth/microsoft/login`,
      });
    }

    console.log(`[OAuth Email Fetch] Found credential for: ${credential.email} (${credential.provider})`);

    // Import decrypt utility
    const { decrypt } = require('../utils/crypto');

    // Decrypt the stored tokens
    let accessToken = credential.oauthToken.accessToken;
    let refreshToken = credential.oauthToken.refreshToken;
    
    console.log(`[OAuth Email Fetch] Access token length: ${accessToken.length}, Refresh token: ${refreshToken ? 'present' : 'missing'}`);

    try {
      accessToken = decrypt(accessToken);
      if (refreshToken) {
        refreshToken = decrypt(refreshToken);
      }
      console.log(`[OAuth Email Fetch] Tokens decrypted successfully`);
    } catch (decryptError) {
      console.error('[OAuth Email Fetch] Decrypt error:', decryptError);
      return res.status(400).json({
        error: 'Failed to decrypt OAuth credentials',
        message: 'Your stored credentials are corrupted. Please re-authenticate.',
      });
    }

    // Create OAuth provider instance with decrypted tokens
    const oauthProvider = EmailProviderFactory.createProvider({
      providerType: 'oauth',
      email: credential.email,
      provider: credential.provider as 'gmail' | 'outlook',
      oauthConfig: {
        clientId: '', // Not needed for fetching with access token
        clientSecret: '', // Not needed for fetching with access token
        accessToken,
        refreshToken,
        expiresAt: credential.oauthToken.expiresAt,
      },
    });

    console.log(`[OAuth Email Fetch] OAuth provider created for: ${credential.provider}`);

    // Authenticate and fetch emails
    const authenticated = await oauthProvider.authenticate();
    if (!authenticated) {
      console.error(`[OAuth Email Fetch] Authentication failed for: ${email}`);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not authenticate with OAuth provider. Your token may have expired.',
      });
    }

    console.log(`[OAuth Email Fetch] Successfully authenticated for: ${email}`);

    // Fetch emails
    const emails = await oauthProvider.fetchEmails({
      limit,
      unreadOnly,
    });

    console.log(`[OAuth Email Fetch] Fetched ${emails.length} emails for: ${email}`);

    res.json({
      success: true,
      provider: credential.provider,
      email: credential.email,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('[OAuth Email Fetch Error]', error);
    res.status(500).json({
      error: 'Failed to fetch OAuth emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Helper: Decrypt OAuth tokens
 */
function decryptTokens(credential: any): { accessToken: string; refreshToken: string } | null {
  try {
    const { decrypt } = require('../utils/crypto');
    let accessToken = decrypt(credential.oauthToken.accessToken);
    let refreshToken = credential.oauthToken.refreshToken ? decrypt(credential.oauthToken.refreshToken) : '';
    return { accessToken, refreshToken };
  } catch (decryptError) {
    console.error(`[OAuth] Decryption error for ${credential.email}:`, decryptError);
    return null;
  }
}

/**
 * Helper: Fetch emails from a single provider
 */
async function fetchEmailsFromProvider(
  credential: any,
  limit: number,
  skip: number,
  unreadOnly: boolean
): Promise<{ emails: any[]; error?: string }> {
  const decrypted = decryptTokens(credential);
  if (!decrypted) {
    return { emails: [], error: `${credential.email}: Failed to decrypt credentials` };
  }

  const oauthProvider = EmailProviderFactory.createProvider({
    providerType: 'oauth',
    email: credential.email,
    provider: credential.provider as 'gmail' | 'outlook',
    oauthConfig: {
      clientId: '',
      clientSecret: '',
      accessToken: decrypted.accessToken,
      refreshToken: decrypted.refreshToken,
      expiresAt: credential.oauthToken.expiresAt,
    },
  });

  const authenticated = await oauthProvider.authenticate();
  if (!authenticated) {
    return { emails: [], error: `${credential.email}: Authentication failed` };
  }

  const emails = await oauthProvider.fetchEmails({ limit, skip, unreadOnly });
  return { emails };
}

/**
 * Get emails from all OAuth-connected accounts
 * GET /api/email/oauth/all
 * Query params: ?limit=20&skip=0&unreadOnly=false
 */
export async function getAllOAuthEmails(req: Request, res: Response) {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const skip = Number.parseInt(req.query.skip as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    // Get all OAuth credentials
    const allCredentials = emailCredentialStore.getAllOAuthCredentials();

    if (allCredentials.length === 0) {
      return res.status(400).json({
        error: 'No OAuth accounts connected',
        message: 'Please authenticate with Google or Microsoft first',
      });
    }

    const allEmails = [];
    const errors = [];

    // Fetch from each account
    for (const credential of allCredentials) {
      try {
        const result = await fetchEmailsFromProvider(credential, limit, skip, unreadOnly);
        
        if (result.error) {
          errors.push(result.error);
        } else {
          allEmails.push(...result.emails);
        }
      } catch (error) {
        errors.push(`${credential.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort by date descending
    allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      count: allEmails.length,
      accounts: allCredentials.length,
      errors: errors.length > 0 ? errors : undefined,
      emails: allEmails,
      hasMore: allEmails.length === limit, // If we got full limit, there might be more
    });
  } catch (error) {
    console.error('[OAuth Email Fetch Error]', error);
    res.status(500).json({
      error: 'Failed to fetch from OAuth accounts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get list of initialized providers
 * GET /api/email/accounts
 */
export async function getAccounts(_req: Request, res: Response) {
  try {
    const accounts = emailService.getInitializedAccounts();
    res.json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get accounts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get all configured email accounts (for settings)
 * GET /api/email/configured
 */
export function getConfiguredAccounts(_req: Request, res: Response) {
  try {
    const accounts = emailCredentialStore.listAccounts();
    res.json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configured accounts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get accounts for a specific provider
 * GET /api/email/provider/:provider
 */
export function getAccountsByProvider(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    
    if (!['gmail', 'yahoo', 'outlook', 'rediff'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: gmail, yahoo, outlook, rediff`,
      });
    }

    const accounts = emailCredentialStore.getCredentialsByProvider(
      provider as 'gmail' | 'yahoo' | 'outlook' | 'rediff'
    );

    const accountList = accounts.map((cred) => ({
      email: cred.email,
      provider: cred.provider,
      configured: cred.providerType === 'imap' && !!cred.imapConfig,
    }));

    res.json({
      success: true,
      count: accountList.length,
      provider,
      accounts: accountList,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get accounts by provider',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Add a new email account
 * POST /api/email/add
 * 
 * Body: {
 *   "email": "user@gmail.com",
 *   "password": "app-password",
 *   "provider": "gmail"
 * }
 */
export function addEmailAccount(req: Request, res: Response) {
  try {
    // Validate input
    const validation = AddEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { email, password, provider } = validation.data;

    // Check if account already exists
    if (emailCredentialStore.hasCredentials(email)) {
      return res.status(409).json({
        error: 'Account already exists',
        message: `Email account ${email} is already configured`,
      });
    }

    // Get IMAP config for provider
    const imapConfig = getImapConfigForProvider(provider);
    if (!imapConfig) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Unsupported provider: ${provider}`,
      });
    }

    // Store credentials (password will be encrypted automatically)
    emailCredentialStore.storeCredentials(email, {
      providerType: 'imap',
      email,
      provider,
      imapConfig: {
        ...imapConfig,
        username: email,
        password, // Will be encrypted in EmailCredentialStore
      },
    });

    res.json({
      success: true,
      message: `Email account ${email} added successfully`,
      account: {
        email,
        provider,
        configured: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add email account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Remove an email account
 * DELETE /api/email/account/:email
 */
export function removeEmailAccount(req: Request, res: Response) {
  try {
    const { email } = req.params;

    if (!emailCredentialStore.hasCredentials(email)) {
      return res.status(404).json({
        error: 'Account not found',
        message: `Email account ${email} is not configured`,
      });
    }

    // Disconnect if initialized
    if (emailService.isInitialized(email)) {
      emailService.disconnectProvider(email).catch((err) => {
        console.error(`Error disconnecting ${email}:`, err);
      });
    }

    emailCredentialStore.removeCredentials(email);

    res.json({
      success: true,
      message: `Email account ${email} removed successfully`,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to remove email account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Test connection with step-by-step progress feedback
 * POST /api/email/test-with-progress
 * 
 * Body: {
 *   "email": "user@gmail.com",
 *   "password": "xxxx xxxx xxxx xxxx" (spaces are stripped automatically),
 *   "provider": "gmail"
 * }
 * 
 * Returns:
 * {
 *   "success": boolean,
 *   "step": 1-4,
 *   "stepName": "Validating Input" | "Retrieving Server Config" | "Authenticating with Provider" | "Ready to Save",
 *   "status": "in-progress" | "completed" | "failed",
 *   "message": string,
 *   "troubleshooting": object (only on failure)
 * }
 */
export async function testConnectionWithProgress(req: Request, res: Response) {
  try {
    const validation = AddEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.json({
        success: false,
        step: 1,
        stepName: 'Validating Input',
        status: 'failed',
        message: 'Invalid email address or missing password',
        details: validation.error.errors,
      });
    }

    let { email, password, provider } = validation.data;
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 STARTING CONNECTION TEST');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📧 Email: ${email}`);
    console.log(`🏷️  Provider: ${provider}`);
    console.log(`🔑 Password length: ${password.length} chars`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Strip spaces from password (Gmail App Passwords have spaces: xxxx xxxx xxxx xxxx)
    const cleanPassword = password.replace(/\s+/g, '');
    
    if (cleanPassword !== password) {
      console.log(`✂️  Stripped ${password.length - cleanPassword.length} spaces from password`);
      console.log(`📏 Clean password length: ${cleanPassword.length} chars\n`);
    }

    // Step 2: Get IMAP Config
    console.log('📋 STEP 2: Retrieving IMAP configuration...');
    const imapConfig = getImapConfigForProvider(provider);
    if (!imapConfig) {
      console.error(`❌ No IMAP config found for provider: ${provider}\n`);
      return res.json({
        success: false,
        step: 2,
        stepName: 'Retrieving Server Config',
        status: 'failed',
        message: `Unsupported provider: ${provider}. Supported: gmail, yahoo, outlook, rediff`,
      });
    }
    
    console.log('✅ IMAP Config retrieved:');
    console.log(`   Host: ${imapConfig.host}`);
    console.log(`   Port: ${imapConfig.port}`);
    console.log(`   TLS: true`);
    console.log('');

    // Step 3: Authenticate with Provider
    console.log('🔐 STEP 3: Creating IMAP provider and authenticating...\n');
    const { ImapEmailProvider } = await import('../services/email/imap-provider');

    const testProvider = new ImapEmailProvider({
      providerType: 'imap',
      email,
      provider,
      imapConfig: {
        ...imapConfig,
        username: email,
        password: cleanPassword,
      },
    });

    console.log('✅ Provider instance created');
    console.log('🚀 Starting authentication process...\n');

    const authStartTime = Date.now();
    
    const authenticated = await testProvider.authenticate();
    
    const authDuration = ((Date.now() - authStartTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Authentication took ${authDuration} seconds`);

    // Always try to disconnect properly
    console.log('🔌 Disconnecting test provider...');
    try {
      await testProvider.disconnect();
      console.log('✅ Disconnected successfully\n');
    } catch (disconnectError) {
      console.error('⚠️  Error disconnecting after test:', disconnectError, '\n');
    }

    if (authenticated) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅✅✅ AUTHENTICATION SUCCESS ✅✅✅');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📧 Email: ${email}`);
      console.log(`🏷️  Provider: ${provider.toUpperCase()}`);
      console.log('═══════════════════════════════════════════════════════════\n');
      return res.json({
        success: true,
        step: 4,
        stepName: 'Ready to Save',
        status: 'completed',
        message: `Successfully authenticated! Click "Add" to save this account.`,
        provider: provider.toUpperCase(),
        email: email,
      });
    } else {
      console.log('═══════════════════════════════════════════════════════════');
      console.error('❌❌❌ AUTHENTICATION FAILED ❌❌❌');
      console.log('═══════════════════════════════════════════════════════════');
      console.error(`📧 Email: ${email}`);
      console.error(`🏷️  Provider: ${provider.toUpperCase()}`);
      console.error(`🔑 Password length: ${cleanPassword.length} chars`);
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // Provide detailed troubleshooting based on provider
      const troubleshootingMap: Record<string, string> = {
        gmail: `Gmail Authentication Failed - Complete Setup Guide:

❌ MOST LIKELY CAUSE: IMAP Not Enabled

✅ CRITICAL: Enable IMAP (THIS IS THE #1 ISSUE)
   1. Go to: Gmail Settings → "Forwarding and POP/IMAP" tab
   2. Look for "IMAP access:" section
   3. You should see options like:
      • "Auto-Expunge on" / "Auto-Expunge off" 
      • "Archive the message" (when deleted in IMAP)
      • "Move to Trash"
      • "Immediately delete"
   4. If you DON'T see these options above "IMAP access:", then:
      ➜ IMAP is DISABLED and you need to enable it
      ➜ Click the enable button/link (varies by Google UI)
      ➜ Look for blue link that says "Enable IMAP"
   5. If you DO see these options, IMAP is already enabled ✓

✅ REQUIRED: 2-Step Verification Must Be Active
   • Go to: myaccount.google.com → Security
   • Check: "2-Step Verification" is ON
   • App Passwords only work with 2FA enabled

✅ VERIFY: App Password Format
   • Should be 16 characters (with or without spaces)
   • You pasted: ${cleanPassword.substring(0, 4)}${'*'.repeat(Math.max(0, cleanPassword.length - 4))} (${cleanPassword.length} chars)
   • ✓ Correct if exactly 16 characters
   • If wrong length, generate NEW app password

✅ DOUBLE-CHECK: Email Address
   • Email: ${email}
   • Make sure this matches your Google Account email exactly
   • No typos, no extra spaces

🔍 FINAL VERIFICATION:
   If IMAP is enabled but still failing:
   1. Generate a FRESH app password (might be app-specific)
   2. Wait 1-2 minutes for changes to propagate
   3. Check Gmail Security activity to see login attempts
   4. Contact Google Support if still failing`,
        yahoo: `Yahoo Authentication Failed - Verify:
1. Go to Account Security → App Passwords
2. Generate password for "Mail" app
3. Check email: ${email}
4. Password should be 16 characters
Current password: ${cleanPassword.substring(0, 4)}${'*'.repeat(Math.max(0, cleanPassword.length - 4))}`,
        outlook: `Outlook Authentication Failed - Diagnostic Report:

🔍 AUTHENTICATION STATUS:
   ${cleanPassword.length === 16 ? 
     '✅ App Password Format Detected (16 chars)' : 
     '⚠️  Regular Password Detected (not recommended)'}
   • Email: ${email}
   • Password length: ${cleanPassword.length} chars
   • Connection: ✅ Successful (reached Microsoft servers)
   • Authentication: ❌ LOGIN failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 TROUBLESHOOTING STEPS:

✅ STEP 1: Enable IMAP in Outlook Settings **CRITICAL**
   🚨 This is often the root cause!
   
   1. Go to: https://outlook.live.com/mail/0/options/mail/accounts
   2. Click "Sync email" under "Accounts"
   3. Scroll down to "POP and IMAP"
   4. Make sure these are checked:
      ✓ "Let devices and apps use IMAP" 
      ✓ OR "Yes, allow IMAP access"
   5. Click "Save" at the bottom
   6. Wait 2-3 minutes for changes to take effect
   7. Try again
   
   Alternative path:
   • outlook.com → ⚙️ Settings (gear icon)
   • "View all Outlook settings" 
   • Mail → Sync email → Enable IMAP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STEP 2: Generate Fresh App Password
   Microsoft App Passwords expire or can become invalid.
   
   1. Go to: https://account.microsoft.com/security
   2. Sign in if prompted
   3. Scroll to "Advanced security options"
   4. Find "App passwords" section
   5. If you see an old "Email" or "IMAP" password, delete it
   6. Click "Create a new app password"
   7. Select purpose: "Email" or "Mail app"
   8. Copy the NEW password (example format: "abcd efgh ijkl mnop")
   9. Paste it here (spaces will be auto-removed)
   10. Try again immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STEP 3: Verify 2-Step Verification is Enabled
   App passwords ONLY work with 2FA enabled.
   
   1. Go to: https://account.microsoft.com/security
   2. Check "Two-step verification" section
   3. Should say "On" or "Enabled"
   4. If "Off", enable it first
   5. Then generate app password

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STEP 4: Check Recent Activity
   1. Go to: https://account.microsoft.com/activity
   2. Look for recent sign-in attempts
   3. Check if any are marked as "unusual" or "blocked"
   4. Approve if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ QUICK CHECKLIST:
   ❓ Is IMAP enabled in Outlook settings? (Most common issue!)
   ❓ Is 2-step verification enabled?
   ❓ Did you generate a brand new app password?
   ❓ Did you wait 2-3 minutes after making changes?
   ❓ Are you using the correct Microsoft account email?
   ❓ Is the account type: Outlook.com / Live.com / Hotmail.com?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MOST LIKELY CAUSES (in order):
   1. 🥇 IMAP not enabled in Outlook settings (80% of cases)
   2. 🥈 App password incorrect or expired
   3. 🥉 2-step verification not enabled
   4. 📍 Changes not propagated yet (wait 2-3 min)`,
        rediff: `Rediff Mail Authentication Failed - Setup Checklist:

✅ STEP 1: Verify Your Email & Password
   • Email: ${email}
   • Must end with @rediffmail.com
   • Password: Your Rediff login password (regular password)
   • No spaces or special characters in password

✅ STEP 2: Verify Password Contains No Spaces
   • Current password: ${cleanPassword.length} characters
   • Remove any spaces if you pasted with spaces
   • Paste exactly as typed without modification

✅ STEP 3: Enable IMAP Access (if required)
   1. Go to Rediffmail.com → Settings/Account
   2. Look for "POP3/IMAP Settings" or "IMAP Access"
   3. Enable IMAP if disabled
   4. Note: May take 1-2 minutes to activate

✅ STEP 4: Check IMAP Configuration
   • IMAP Host: imap.rediff.com (port 993) ✓ Configured
   • TLS/SSL: Enabled ✓

🔍 COMMON REDIFF ISSUES:
   • Email address typo
   • Account security settings blocking IMAP
   • Password expired/changed
   • IMAP not enabled for the account
   
Current credentials check:
   • Email: ${email}
   • Password length: ${cleanPassword.length} chars`,
      };

      return res.json({
        success: false,
        step: 3,
        stepName: 'Authenticating with Provider',
        status: 'failed',
        message: `Authentication failed for ${email}`,
        troubleshooting: troubleshootingMap[provider] || 'Check your credentials and try again',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Connection test error:', { error, message });
    res.json({
      success: false,
      step: 3,
      stepName: 'Authenticating with Provider',
      status: 'failed',
      message: `Connection error: ${message}`,
      troubleshooting: 'Check your internet connection and credentials',
    });
  }
}

/**
 * Test connection for an email account
 * POST /api/email/test
 * 
 * Body: {
 *   "email": "user@gmail.com",
 *   "password": "app-password (with or without spaces)",
 *   "provider": "gmail"
 * }
 */
export async function testConnection(req: Request, res: Response) {
  try {
    const validation = AddEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    let { email, password, provider } = validation.data;
    console.log(`Testing connection for ${email} (${provider})`);

    // Strip spaces from password (Gmail App Passwords have spaces: xxxx xxxx xxxx xxxx)
    const cleanPassword = password.replace(/\s+/g, '');

    // Get IMAP config
    const imapConfig = getImapConfigForProvider(provider);
    if (!imapConfig) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Unsupported provider: ${provider}`,
      });
    }

    // Import IMAP provider dynamically to test
    const { ImapEmailProvider } = await import('../services/email/imap-provider');

    const testProvider = new ImapEmailProvider({
      providerType: 'imap',
      email,
      provider,
      imapConfig: {
        ...imapConfig,
        username: email,
        password: cleanPassword,
      },
    });

    console.log(`Attempting to authenticate ${email}...`);
    const authenticated = await testProvider.authenticate();
    
    // Always try to disconnect properly
    try {
      await testProvider.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting after test:', disconnectError);
    }

    if (authenticated) {
      console.log(`✓ Successfully authenticated ${email}`);
      res.json({
        success: true,
        message: 'Connection successful',
        connected: true,
      });
    } else {
      console.error(`✗ Authentication failed for ${email}`);
      res.status(401).json({
        error: 'Authentication failed',
        message: `Failed to authenticate ${email}. Please check your email and app password.
        
For Gmail:
- Use an App Password (not your regular password)
- Enable 2-Step Verification first
- Generate password at: https://myaccount.google.com/apppasswords
- App password format: xxxx xxxx xxxx xxxx (copy with spaces, we'll remove them)`,
        connected: false,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Connection test error:', error);
    res.status(500).json({
      error: 'Connection test failed',
      message: `${message}

Troubleshooting:
- Gmail: Use App Password from myaccount.google.com/apppasswords (copy with spaces)
- Yahoo: Use generated App Password
- Outlook: Use your Microsoft password
- Make sure your email address is correct`,
      connected: false,
    });
  }
}

/**
 * Clear cache for better performance testing
 * POST /api/email/cache/clear
 */
export function clearCache(req: Request, res: Response) {
  try {
    const { email } = req.body;
    emailService.clearCache(email);
    res.json({
      success: true,
      message: email ? `Cache cleared for ${email}` : 'All caches cleared',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Disconnect all providers (cleanup)
 * POST /api/email/disconnect-all
 */
export async function disconnectAll(_req: Request, res: Response) {
  try {
    await emailService.disconnectAll();
    res.json({
      success: true,
      message: 'All providers disconnected',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to disconnect',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
