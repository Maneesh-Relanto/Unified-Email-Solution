/**
 * Email Service Layer
 * High-level API for managing emails from multiple providers
 * Handles authentication, caching, and multi-provider coordination
 */

import { EmailProvider, EmailCredentials, ParsedEmail, FetchEmailsOptions } from '../services/email/types';
import { EmailProviderFactory } from '../services/email/index';

interface EmailCache {
  emails: ParsedEmail[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class EmailService {
  private providers: Map<string, EmailProvider> = new Map();
  private cache: Map<string, EmailCache> = new Map();
  private defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize provider for a given email account
   * @param credentials Email provider credentials
   */
  async initializeProvider(credentials: EmailCredentials): Promise<void> {
    const key = credentials.email;

    try {
      const provider = EmailProviderFactory.createProvider(credentials);
      const authenticated = await provider.authenticate();

      if (!authenticated) {
        throw new Error('Failed to authenticate with email provider');
      }

      this.providers.set(key, provider);
      console.log(`✓ Email provider initialized for: ${key}`);
    } catch (error) {
      console.error(`✗ Failed to initialize provider for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Fetch emails from a specific account
   * @param email Email address
   * @param options Fetch options
   */
  async fetchEmails(email: string, options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    const provider = this.providers.get(email);
    if (!provider) {
      throw new Error(`No provider initialized for: ${email}`);
    }

    // Check cache
    const cached = this.cache.get(email);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for: ${email}`);
      return cached.emails;
    }

    // Fetch fresh emails
    const emails = await provider.fetchEmails(options);

    // Update cache
    this.cache.set(email, {
      emails,
      timestamp: Date.now(),
      ttl: options?.limit ? this.defaultCacheTTL : 10 * 60 * 1000,
    });

    return emails;
  }

  /**
   * Fetch emails from all initialized providers
   * Combines emails from multiple accounts
   */
  async fetchAllEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    const allEmails: ParsedEmail[] = [];

    for (const [email, provider] of this.providers) {
      try {
        const emails = await this.fetchEmails(email, options);
        allEmails.push(...emails);
      } catch (error) {
        console.error(`Error fetching emails from ${email}:`, error);
      }
    }

    // Sort by date descending
    allEmails.sort((a, b) => b.date.getTime() - a.date.getTime());

    return allEmails;
  }

  /**
   * Get list of initialized email accounts
   */
  getInitializedAccounts(): Array<{ email: string; provider: string }> {
    const accounts: Array<{ email: string; provider: string }> = [];

    for (const [email, provider] of this.providers) {
      accounts.push({
        email,
        provider: provider.getProviderInfo().displayName,
      });
    }

    return accounts;
  }

  /**
   * Disconnect a specific provider
   */
  async disconnectProvider(email: string): Promise<void> {
    const provider = this.providers.get(email);
    if (provider) {
      await provider.disconnect();
      this.providers.delete(email);
      this.cache.delete(email);
      console.log(`✓ Disconnected provider for: ${email}`);
    }
  }

  /**
   * Disconnect all providers
   */
  async disconnectAll(): Promise<void> {
    for (const [email, provider] of this.providers) {
      await provider.disconnect();
    }
    this.providers.clear();
    this.cache.clear();
    console.log('✓ All providers disconnected');
  }

  /**
   * Clear cache for specific or all emails
   */
  clearCache(email?: string): void {
    if (email) {
      this.cache.delete(email);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(email: string): boolean {
    return this.providers.has(email);
  }
}

// Export singleton instance
export const emailService = new EmailService();
