/**
 * Email Configuration and Credential Management
 * Handles storing and retrieving credentials for multiple email accounts
 * Supports multiple accounts per provider (Gmail, Yahoo, Outlook, Rediff)
 * 
 * SECURITY: Passwords are encrypted using AES-256-CBC before storage
 * For production, migrate to:
 * - Database (MongoDB, PostgreSQL) with encrypted fields
 * - Hardware security module (HSM) for key management
 * - Vault service (HashiCorp, AWS Secrets Manager)
 */

import { EmailCredentials } from '../services/email/types';
import { encrypt, decrypt, decryptIfNeeded } from '../utils/crypto';

/**
 * Provider type alias
 */
type ProviderType = 'gmail' | 'yahoo' | 'outlook' | 'rediff';

/**
 * In-memory storage for credentials
 * SECURITY: Passwords are encrypted before storage
 * Note: Still in-memory, migrate to persistent encrypted storage in production
 */
class EmailCredentialStore {
  private readonly credentials: Map<string, EmailCredentials> = new Map();

  /**
   * Store email credentials with encrypted password
   * @param key Unique key (email address)
   * @param credentials Email provider credentials
   */
  storeCredentials(key: string, credentials: EmailCredentials): void {
    // Validate IMAP config if present
    if (credentials.providerType === 'imap' && credentials.imapConfig) {
      if (!credentials.imapConfig.username || !credentials.imapConfig.password) {
        throw new Error('Invalid IMAP credentials: username and password required');
      }
      // Encrypt the password before storage
      const encryptedPassword = encrypt(credentials.imapConfig.password);
      credentials = {
        ...credentials,
        imapConfig: {
          ...credentials.imapConfig,
          password: encryptedPassword,
        },
      };
    }
    this.credentials.set(key, credentials);
  }

  /**
   * Get credentials by key (email) with decrypted password
   */
  getCredentials(key: string): EmailCredentials | undefined {
    const cred = this.credentials.get(key);
    if (!cred) return undefined;
    
    // Decrypt password if present
    if (cred.imapConfig?.password) {
      return {
        ...cred,
        imapConfig: {
          ...cred.imapConfig,
          password: decryptIfNeeded(cred.imapConfig.password),
        },
      };
    }
    return cred;
  }

  /**
   * Get all credentials with decrypted passwords
   */
  getAllCredentials(): EmailCredentials[] {
    return Array.from(this.credentials.values()).map((cred) => {
      if (cred.imapConfig?.password) {
        return {
          ...cred,
          imapConfig: {
            ...cred.imapConfig,
            password: decryptIfNeeded(cred.imapConfig.password),
          },
        };
      }
      return cred;
    });
  }

  /**
   * Get credentials by provider type with decrypted passwords
   * @param provider 'gmail' | 'yahoo' | 'outlook' | 'rediff'
   */
  getCredentialsByProvider(provider: ProviderType): EmailCredentials[] {
    return Array.from(this.credentials.values())
      .filter((cred) => cred.provider === provider)
      .map((cred) => {
        if (cred.imapConfig?.password) {
          return {
            ...cred,
            imapConfig: {
              ...cred.imapConfig,
              password: decryptIfNeeded(cred.imapConfig.password),
            },
          };
        }
        return cred;
      });
  }

  /**
   * List all stored email credentials with decrypted passwords
   */
  listCredentials(): EmailCredentials[] {
    return this.getAllCredentials();
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

  // ===== OAUTH CREDENTIAL METHODS =====

  private readonly oauthCredentials: Map<string, any> = new Map();

  /**
   * Store OAuth credential
   * @param key Unique key in format: `provider_email` (e.g., `google_user@gmail.com`)
   * @param credential OAuth credential with encrypted token
   */
  setOAuthCredential(key: string, credential: any): void {
    this.oauthCredentials.set(key, credential);
    console.log(`✓ Stored OAuth credential: ${key}`);
  }

  /**
   * Get OAuth credential
   * @param key Unique key in format: `provider_email`
   */
  getOAuthCredential(key: string): any | undefined {
    return this.oauthCredentials.get(key);
  }

  /**
   * Get all OAuth credentials
   */
  getAllOAuthCredentials(): any[] {
    return Array.from(this.oauthCredentials.values());
  }

  /**
   * Get OAuth credentials by provider
   * @param provider 'google' or 'microsoft'
   */
  getOAuthCredentialsByProvider(provider: 'google' | 'microsoft'): any[] {
    return Array.from(this.oauthCredentials.values()).filter(
      cred => cred.provider === provider
    );
  }

  /**
   * Remove OAuth credential
   * @param key Unique key in format: `provider_email`
   */
  removeOAuthCredential(key: string): boolean {
    const deleted = this.oauthCredentials.delete(key);
    if (deleted) {
      console.log(`✓ Removed OAuth credential: ${key}`);
    }
    return deleted;
  }

  /**
   * Check if OAuth credential exists
   * @param key Unique key in format: `provider_email`
   */
  hasOAuthCredential(key: string): boolean {
    return this.oauthCredentials.has(key);
  }

  /**
   * List all OAuth accounts
   */
  listOAuthAccounts(): Array<{
    id: string;
    provider: string;
    email: string;
    expiresAt: number;
  }> {
    return Array.from(this.oauthCredentials.entries()).map(([id, cred]) => ({
      id,
      provider: cred.provider,
      email: cred.email,
      expiresAt: cred.oauthToken.expiresAt,
    }));
  }
}

// Export singleton instance
export const emailCredentialStore = new EmailCredentialStore();

// Export class for type definitions
export { EmailCredentialStore };

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

/**
 * Helper: Load indexed credentials for a provider
 * PROVIDER_1_EMAIL, PROVIDER_1_PASSWORD, PROVIDER_2_EMAIL, etc.
 */
function loadIndexedCredentials(provider: ProviderType): void {
  for (let i = 1; i <= 5; i++) {
    const emailEnvKey = `${provider.toUpperCase()}_${i}_EMAIL`;
    const passwordEnvKey = `${provider.toUpperCase()}_${i}_PASSWORD`;

    const email = process.env[emailEnvKey];
    const password = process.env[passwordEnvKey];

    if (email && password) {
      storeProviderCredential(provider, email, password);
    }
  }
}

/**
 * Helper: Load legacy single-account credentials
 * PROVIDER_EMAIL, PROVIDER_PASSWORD format
 */
function loadLegacyCredentials(provider: ProviderType): void {
  const emailEnvKey = `${provider.toUpperCase()}_EMAIL`;
  const passwordEnvKey = `${provider.toUpperCase()}_PASSWORD`;

  const email = process.env[emailEnvKey];
  const password = process.env[passwordEnvKey];

  if (email && password && !emailCredentialStore.hasCredentials(email)) {
    storeProviderCredential(provider, email, password);
  }
}

/**
 * Helper: Store a single provider credential
 */
function storeProviderCredential(
  provider: ProviderType,
  email: string,
  password: string
): void {
  try {
    const imapConfig = getImapConfigForProvider(provider);
    if (imapConfig) {
      emailCredentialStore.storeCredentials(email, {
        providerType: 'imap',
        email,
        provider,
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

/**
 * Main function: Load all credentials from environment
 */
export function loadCredentialsFromEnv(): void {
  const providers: Array<'gmail' | 'yahoo' | 'outlook' | 'rediff'> = ['gmail', 'yahoo', 'outlook', 'rediff'];

  for (const provider of providers) {
    loadIndexedCredentials(provider);
    loadLegacyCredentials(provider);
  }
}

/**
 * Get IMAP configuration for a provider
 */
export function getImapConfigForProvider(
  provider: ProviderType
): { host: string; port: number } | null {
  const configs: Record<ProviderType, { host: string; port: number }> = {
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

