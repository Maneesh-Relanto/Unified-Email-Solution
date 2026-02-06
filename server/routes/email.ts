/**
 * Email API Routes
 * Demonstrates using the email service with IMAP
 */

import { Request, Response } from 'express';
import { emailService } from '../services/email-service';
import { emailCredentialStore, loadCredentialsFromEnv, getImapConfigForProvider } from '../config/email-config';
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
    const limit = parseInt(req.query.limit as string) || 20;
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
    const limit = parseInt(req.query.limit as string) || 20;
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

    // Store credentials
    emailCredentialStore.storeCredentials(email, {
      providerType: 'imap',
      email,
      provider,
      imapConfig: {
        ...imapConfig,
        username: email,
        password, // TODO: Encrypt this in production
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
 * Test connection for an email account
 * POST /api/email/test
 * 
 * Body: {
 *   "email": "user@gmail.com",
 *   "password": "app-password",
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

    const { email, password, provider } = validation.data;

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
        password,
      },
    });

    const authenticated = await testProvider.authenticate();
    await testProvider.disconnect();

    if (authenticated) {
      res.json({
        success: true,
        message: 'Connection successful',
        connected: true,
      });
    } else {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
        connected: false,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Connection test failed',
      message,
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
