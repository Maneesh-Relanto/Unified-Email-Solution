/**
 * Email Provider Types and Interfaces
 * Flexible architecture to support multiple authentication methods:
 * - IMAP
 * - OAuth2 (Gmail, Outlook, Yahoo)
 * - Microsoft Graph API
 * - Other future providers
 */

export type EmailProviderType = 'imap' | 'oauth' | 'graph';

export interface EmailCredentials {
  providerType: EmailProviderType;
  email: string;
  provider: 'gmail' | 'yahoo' | 'outlook' | 'rediff';
  // IMAP specific
  imapConfig?: {
    host: string;
    port: number;
    username: string;
    password: string; // Should be encrypted/hashed
  };
  // OAuth specific
  oauthConfig?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
  };
  // Graph API specific
  graphConfig?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
}

export interface ParsedEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  date: Date;
  read: boolean;
  providerName: string;
  // Optional full content
  body?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;
}

export interface FetchEmailsOptions {
  limit?: number;
  unreadOnly?: boolean;
  folder?: string;
  since?: Date;
}

export interface EmailProvider {
  /**
   * Authenticate and validate credentials
   */
  authenticate(): Promise<boolean>;

  /**
   * Fetch emails from the provider
   */
  fetchEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]>;

  /**
   * Mark email as read
   */
  markAsRead(emailId: string, read: boolean): Promise<void>;

  /**
   * Disconnect/cleanup
   */
  disconnect(): Promise<void>;

  /**
   * Get provider info
   */
  getProviderInfo(): {
    type: EmailProviderType;
    displayName: string;
    email: string;
  };
}

export interface EmailServiceConfig {
  credentials: EmailCredentials;
  retryAttempts?: number;
  timeout?: number;
}
