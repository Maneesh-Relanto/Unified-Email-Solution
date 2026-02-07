/**
 * OAuth Email Provider
 * Fetches emails from Gmail and Outlook using OAuth2 access tokens
 * Supports Google Gmail API and Microsoft Graph API
 */

import axios, { AxiosInstance } from 'axios';
import {
  EmailProvider,
  EmailCredentials,
  ParsedEmail,
  FetchEmailsOptions,
} from './types';
import { googleOAuthService } from '../oauth/google-oauth';
import { microsoftOAuthService } from '../oauth/microsoft-oauth';
import { emailCredentialStore } from '../../config/email-config';

export class OAuthEmailProvider implements EmailProvider {
  private readonly email: string;
  private readonly provider: 'gmail' | 'outlook';
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private readonly apiClient: AxiosInstance;
  private readonly messageCache: Map<string, ParsedEmail[]> = new Map();

  constructor(credentials: EmailCredentials) {
    if (!credentials.oauthConfig) {
      throw new Error('OAuth credentials missing');
    }

    this.email = credentials.email;
    this.provider = credentials.provider as 'gmail' | 'outlook';
    this.accessToken = credentials.oauthConfig.accessToken || '';
    this.refreshToken = credentials.oauthConfig.refreshToken || '';
    this.expiresAt = credentials.oauthConfig.expiresAt || 0;

    // Initialize API client based on provider
    this.apiClient = axios.create({
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    console.log(`[OAuth Email Provider] Initialized for ${this.provider} (${this.email})`);
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log(`[OAuth ${this.provider}] Starting authentication for: ${this.email}`);
      
      // Check if token is expired and refresh if needed
      await this.ensureValidToken();
      console.log(`[OAuth ${this.provider}] Token is valid`);

      // Verify token works by fetching user profile
      const userInfo = await this.fetchUserProfile();
      console.log(`[OAuth ${this.provider}] User profile fetched: ${userInfo.email}`);

      if (!userInfo.email) {
        console.error('[OAuth Email Provider] Could not verify user email');
        return false;
      }

      console.log(`[OAuth Email Provider] Authenticated successfully: ${userInfo.email}`);
      return true;
    } catch (error) {
      console.error(`[OAuth ${this.provider}] Authentication failed:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  async fetchEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    try {
      await this.ensureValidToken();

      if (this.provider === 'gmail' || this.provider === 'google') {
        return await this.fetchGmailEmails(options);
      } else {
        return await this.fetchOutlookEmails(options);
      }
    } catch (error) {
      console.error(`[OAuth Email Provider] Error fetching emails:`, error);
      throw error;
    }
  }

  async markAsRead(emailId: string, read: boolean): Promise<void> {
    try {
      await this.ensureValidToken();

      if (this.provider === 'gmail' || this.provider === 'google') {
        const action = read ? 'removeLabels' : 'addLabels';
        await this.apiClient.post(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/${action}`,
          {
            ids: [emailId],
            [action === 'removeLabels' ? 'removeLabels' : 'addLabels']: ['UNREAD'],
          }
        );
      } else {
        // Microsoft Graph doesn't support marking via API directly in the same way
        // This would require updating the message itself
        console.warn(
          '[OAuth Email Provider] markAsRead not fully implemented for Outlook'
        );
      }

      console.log(
        `[OAuth Email Provider] Email ${emailId} marked as ${read ? 'read' : 'unread'}`
      );
    } catch (error) {
      console.error('[OAuth Email Provider] Error marking email as read:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.provider === 'gmail') {
        await googleOAuthService.revokeToken(this.accessToken);
      } else {
        await microsoftOAuthService.revokeToken(this.accessToken);
      }

      console.log(`[OAuth Email Provider] Disconnected ${this.provider}`);
    } catch (error) {
      console.error('[OAuth Email Provider] Error disconnecting:', error);
      // Continue anyway even if revocation fails
    }
  }

  getProviderInfo() {
    return {
      type: 'oauth' as const,
      displayName: this.provider === 'gmail' || this.provider === 'google' ? 'Gmail (OAuth)' : 'Outlook (OAuth)',
      email: this.email,
    };
  }

  // ===== Private Methods =====

  private async ensureValidToken(): Promise<void> {
    const nowMs = Date.now();
    const expiresInMs = this.expiresAt - nowMs;
    const expiresInMinutes = Math.round(expiresInMs / 60 / 1000);
    
    console.log(`[OAuth ${this.provider}] Token check: expires in ${expiresInMinutes} minutes`);
    
    // Check if token expires within 5 minutes
    if (expiresInMs < 5 * 60 * 1000) {
      console.log('[OAuth Email Provider] Token expired or expiring soon, refreshing...');
      await this.refreshAccessToken();
    } else {
      console.log(`[OAuth ${this.provider}] Token is still valid`);
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      let newToken;

      if (this.provider === 'gmail' || this.provider === 'google') {
        newToken = await googleOAuthService.refreshToken(this.refreshToken);
      } else {
        newToken = await microsoftOAuthService.refreshToken(this.refreshToken);
      }

      this.accessToken = newToken.accessToken;
      this.refreshToken = newToken.refreshToken;
      this.expiresAt = newToken.expiresAt;

      // Update authorization header
      this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      // Update stored credential
      const key = `${this.provider}_${this.email}`;
      const credential = emailCredentialStore.getOAuthCredential(key);
      if (credential) {
        credential.oauthToken.accessToken = this.accessToken;
        credential.oauthToken.refreshToken = this.refreshToken;
        credential.oauthToken.expiresAt = this.expiresAt;
        emailCredentialStore.setOAuthCredential(key, credential);
      }

      console.log('[OAuth Email Provider] Token refreshed successfully');
    } catch (error) {
      console.error('[OAuth Email Provider] Failed to refresh token:', error);
      throw new Error('Token refresh failed');
    }
  }

  private async fetchUserProfile(): Promise<{ email: string; name: string }> {
    try {
      if (this.provider === 'gmail' || this.provider === 'google') {
        console.log('[OAuth gmail] Fetching user profile from Gmail API...');
        console.log(`[OAuth gmail] Authorization header: Bearer ${this.accessToken.substring(0, 20)}...`);
        
        const response = await this.apiClient.get(
          'https://www.googleapis.com/oauth2/v2/userinfo'
        );
        
        console.log(`[OAuth gmail] Profile response received: ${response.data.email}`);
        
        return {
          email: response.data.email,
          name: response.data.name || response.data.email,
        };
      } else {
        console.log('[OAuth microsoft] Fetching user profile from Microsoft Graph...');
        
        const response = await this.apiClient.get('https://graph.microsoft.com/v1.0/me');
        return {
          email: response.data.userPrincipalName || response.data.mail,
          name: response.data.displayName || response.data.userPrincipalName,
        };
      }
    } catch (error) {
      console.error(`[OAuth ${this.provider}] Error fetching user profile:`, error instanceof Error ? {message: error.message, status: (error as any).response?.status, statusText: (error as any).response?.statusText} : error);
      throw error;
    }
  }

  private async fetchGmailEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    try {
      const limit = options?.limit || 20;
      const unreadOnly = options?.unreadOnly || false;

      // Build query
      let query = 'in:inbox';
      if (unreadOnly) {
        query += ' is:unread';
      }
      if (options?.since) {
        const sinceDate = options.since.toISOString().split('T')[0];
        query += ` after:${sinceDate}`;
      }

      // Get message list
      const listResponse = await this.apiClient.get(
        'https://www.googleapis.com/gmail/v1/users/me/messages',
        {
          params: {
            q: query,
            maxResults: limit,
          },
        }
      );

      const messageIds = listResponse.data.messages || [];
      
      if (messageIds.length === 0) {
        console.log('[OAuth Email Provider] No Gmail emails found');
        return [];
      }

      // Fetch full message details
      const emails: ParsedEmail[] = [];

      for (const msg of messageIds.slice(0, limit)) {
        try {
          const emailData = await this.fetchGmailMessage(msg.id);
          if (emailData) {
            emails.push(emailData);
          }
        } catch (error) {
          console.error(`[OAuth Email Provider] Error fetching Gmail message ${msg.id}:`, error);
          continue;
        }
      }

      console.log(`[OAuth Email Provider] Fetched ${emails.length} Gmail emails`);
      return emails;
    } catch (error) {
      console.error('[OAuth Email Provider] Error fetching Gmail emails:', error);
      throw error;
    }
  }

  private async fetchGmailMessage(messageId: string): Promise<ParsedEmail | null> {
    try {
      const response = await this.apiClient.get(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          params: {
            format: 'full',
          },
        }
      );

      const message = response.data;
      const headers = message.payload.headers;
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name === name)?.value || '';

      // Decode body
      let body = '';
      let html = '';
      if (message.payload.parts) {
        // Multipart message
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && !body) {
            body = this.decodeBase64(part.body.data || '');
          } else if (part.mimeType === 'text/html' && !html) {
            html = this.decodeBase64(part.body.data || '');
          }
        }
      } else if (message.payload.body?.data) {
        body = this.decodeBase64(message.payload.body.data);
      }

      const preview = body.substring(0, 200).replace(/\n/g, ' ');
      const isUnread = message.labelIds?.includes('UNREAD') || false;

      return {
        id: `gmail_${messageId}`,
        from: {
          name: getHeader('From').replace(/<.*>/, '').trim() || 'Unknown',
          email: getHeader('From').match(/<(.+?)>/) ?
            getHeader('From').match(/<(.+?)>/)?.[1] || '' :
            getHeader('From'),
        },
        subject: getHeader('Subject'),
        preview,
        body,
        html,
        date: new Date(Number.parseInt(message.internalDate)),
        read: !isUnread,
        providerName: 'Gmail (OAuth)',
      };
    } catch (error) {
      console.error('[OAuth Email Provider] Error parsing Gmail message:', error);
      return null;
    }
  }

  private async fetchOutlookEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    try {
      const limit = options?.limit || 20;

      let filter = '';
      if (options?.unreadOnly) {
        filter = '&$filter=isRead eq false';
      }

      let url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc${filter}`;

      const response = await this.apiClient.get(url);
      const messages = response.data.value || [];

      const emails: ParsedEmail[] = messages.map((msg: any) => {
        const preview = msg.bodyPreview || msg.body?.content?.substring(0, 200) || '';

        return {
          id: `outlook_${msg.id}`,
          from: {
            name: msg.from?.emailAddress?.name || 'Unknown',
            email: msg.from?.emailAddress?.address || '',
          },
          subject: msg.subject,
          preview,
          body: msg.body?.content || '',
          html: msg.body?.contentType === 'html' ? msg.body.content : undefined,
          date: new Date(msg.receivedDateTime),
          read: msg.isRead,
          providerName: 'Outlook (OAuth)',
        };
      });

      console.log(`[OAuth Email Provider] Fetched ${emails.length} Outlook emails`);
      return emails;
    } catch (error) {
      console.error('[OAuth Email Provider] Error fetching Outlook emails:', error);
      throw error;
    }
  }

  private decodeBase64(str: string): string {
    try {
      if (!str) return '';
      
      // URL-safe base64 decode
      const safe = str.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(safe, 'base64').toString('utf-8');
      return decoded;
    } catch (error) {
      console.error('[OAuth Email Provider] Error decoding base64:', error);
      return '';
    }
  }
}
