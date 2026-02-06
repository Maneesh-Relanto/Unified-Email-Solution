/**
 * Email Configuration and Credential Management
 * Handles storing and retrieving credentials for multiple email accounts
 * Supports multiple accounts per provider (Gmail, Yahoo, Outlook, Rediff)
 * 
 * TODO: Replace with secure storage:
 * - Database (MongoDB, PostgreSQL)
 * - Encrypted file storage
 * - Environment variables with encryption
 */

import { EmailCredentials } from '../services/email/types';

/**
 * In-memory storage for credentials (development)
 * THIS IS NOT SECURE - Only for development!
 * Use encrypted database storage in production
 */
class EmailCredentialStore {
  private credentials: Map<string, EmailCredentials> = new Map();

  /**
   * Store email credentials
   * @param key Unique key (email address)
   * @param credentials Email provider credentials
   */
  storeCredentials(key: string, credentials: EmailCredentials): void {
    // Validate IMAP config if present
    if (credentials.providerType === 'imap' && credentials.imapConfig) {
      if (!credentials.imapConfig.username || !credentials.imapConfig.password) {
        throw new Error('Invalid IMAP credentials: username and password required');
      }
    }
    this.credentials.set(key, credentials);
  }

  /**
   * Get credentials by key (email)
   */
  getCredentials(key: string): EmailCredentials | undefined {
    return this.credentials.get(key);
  }

  /**
   * Get all credentials
   */
  getAllCredentials(): EmailCredentials[] {
    return Array.from(this.credentials.values());
  }

  /**
   * Get credentials by provider type
   * @param provider 'gmail' | 'yahoo' | 'outlook' | 'rediff'
   */
  getCredentialsByProvider(provider: 'gmail' | 'yahoo' | 'outlook' | 'rediff'): EmailCredentials[] {
    return Array.from(this.credentials.values()).filter(
      (cred) => cred.provider === provider
    );
  }

  /**
   * List all stored email credentials
   */
  listCredentials(): EmailCredentials[] {
    return Array.from(this.credentials.values());
  }

  /**
   * Remove email credentials
   * @param key Email address key
   */
  removeCredentials(key: string): boolean {
    return this.credentials.delete(key);
  }

  /**
   * Check if credentials exist
   * @param key Email address key
   */
  hasCredentials(key: string): boolean {
    return this.credentials.has(key);
  }

  /**
   * List all configured accounts with metadata
   */
  listAccounts(): Array<{
    email: string;
    provider: string;
    configured: boolean;
  }> {
    const accounts: Array<{ email: string; provider: string; configured: boolean }> = [];
    for (const [key, cred] of this.credentials) {
      accounts.push({
        email: key,
        provider: cred.provider,
        configured: cred.providerType === 'imap' && !!cred.imapConfig,
      });
    }
    return accounts;
  }

  /**
   * Clear all credentials (for testing)
   */
  clear(): void {
    this.credentials.clear();
  }
}

// Export singleton instance
export const emailCredentialStore = new EmailCredentialStore();

/**
 * Load credentials from environment variables
 * Supports multiple accounts with naming convention:
 * PROVIDER_INDEX_EMAIL=email@example.com
 * PROVIDER_INDEX_PASSWORD=password
 *
 * Examples:
 * GMAIL_1_EMAIL=first@gmail.com
 * GMAIL_1_PASSWORD=password1
 * GMAIL_2_EMAIL=second@gmail.com
 * GMAIL_2_PASSWORD=password2
 *
 * Also supports legacy single-account format:
 * GMAIL_EMAIL=email@gmail.com
 * GMAIL_PASSWORD=password
 */
export function loadCredentialsFromEnv(): void {
  const providers = ['gmail', 'yahoo', 'outlook', 'rediff'];

  for (const provider of providers) {
    // Try to load credentials with different index numbers
    for (let i = 1; i <= 5; i++) {
      const emailEnvKey = `${provider.toUpperCase()}_${i}_EMAIL`;
      const passwordEnvKey = `${provider.toUpperCase()}_${i}_PASSWORD`;

      const email = process.env[emailEnvKey];
      const password = process.env[passwordEnvKey];

      if (email && password) {
        try {
          const imapConfig = getImapConfigForProvider(provider as any);
          if (imapConfig) {
            emailCredentialStore.storeCredentials(email, {
              providerType: 'imap',
              email,
              provider: provider as any,
              imapConfig: {
                ...imapConfig,
                username: email,
                password,
              },
            });
            console.log(`✓ Loaded ${provider} credentials for: ${email}`);
          }
        } catch (error) {
          console.error(`Failed to load ${provider} credentials:`, error);
        }
      }
    }

    // Also support legacy single-account format
    const emailEnvKey = `${provider.toUpperCase()}_EMAIL`;
    const passwordEnvKey = `${provider.toUpperCase()}_PASSWORD`;

    const email = process.env[emailEnvKey];
    const password = process.env[passwordEnvKey];

    if (email && password && !emailCredentialStore.hasCredentials(email)) {
      try {
        const imapConfig = getImapConfigForProvider(provider as any);
        if (imapConfig) {
          emailCredentialStore.storeCredentials(email, {
            providerType: 'imap',
            email,
            provider: provider as 'gmail' | 'yahoo' | 'outlook' | 'rediff',
            imapConfig: {
              ...imapConfig,
              username: email,
              password,
            },
          });
          console.log(`✓ Loaded ${provider} credentials for: ${email}`);
        }
      } catch (error) {
        console.error(`Failed to load ${provider} credentials:`, error);
      }
    }
  }
}

/**
 * Get IMAP configuration for a provider
 */
export function getImapConfigForProvider(
  provider: 'gmail' | 'yahoo' | 'outlook' | 'rediff'
): { host: string; port: number } | null {
  const configs: Record<string, { host: string; port: number }> = {
    gmail: {
      host: 'imap.gmail.com',
      port: 993,
    },
    yahoo: {
      host: 'imap.mail.yahoo.com',
      port: 993,
    },
    outlook: {
      host: 'outlook.office365.com',
      port: 993,
    },
    rediff: {
      host: 'imap.rediff.com',
      port: 993,
    },
  };

  return configs[provider] || null;
}
