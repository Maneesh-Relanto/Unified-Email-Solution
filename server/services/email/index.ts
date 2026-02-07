/**
 * Email Provider Factory
 * Creates appropriate provider instance based on authentication type
 * Extensible for future auth methods: OAuth, Graph API, etc.
 */

import { EmailProvider, EmailCredentials, EmailProviderType } from './types';
import { ImapEmailProvider } from './imap-provider';
import { OAuthEmailProvider } from './oauth-provider';
// import { GraphAPIEmailProvider } from './graph-provider';

export class EmailProviderFactory {
  static createProvider(credentials: EmailCredentials): EmailProvider {
    switch (credentials.providerType) {
      case 'imap':
        return new ImapEmailProvider(credentials);
      
      case 'oauth':
        return new OAuthEmailProvider(credentials);
      
      case 'graph':
        // TODO: Implement Graph API provider
        throw new Error('Microsoft Graph API provider not yet implemented');
      
      default:
        throw new Error(`Unsupported provider type: ${credentials.providerType}`);
    }
  }

  /**
   * Get IMAP configuration for common email providers
   * Useful helper to reduce user input
   */
  static getImapConfig(provider: 'gmail' | 'yahoo' | 'outlook' | 'rediff') {
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

  /**
   * Get OAuth configuration templates (for future use)
   */
  static getOAuthConfig(provider: 'gmail' | 'yahoo' | 'outlook' | 'rediff') {
    const configs: Record<string, { authUrl: string; tokenUrl: string; scope: string[] }> = {
      gmail: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      },
      yahoo: {
        authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
        tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
        scope: ['mail-r'],
      },
      outlook: {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: ['Mail.Read'],
      },
      rediff: {
        authUrl: '', // Rediff might not have OAuth
        tokenUrl: '',
        scope: [],
      },
    };

    return configs[provider] || null;
  }
}
