/**
 * IMAP Email Provider Implementation
 * Supports: Gmail, Yahoo, Outlook, Rediff
 * Uses node-imap and mailparser
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EmailProvider, EmailCredentials, ParsedEmail, FetchEmailsOptions } from './types';

export class ImapEmailProvider implements EmailProvider {
  private imap: Imap;
  private credentials: EmailCredentials;
  private authenticated: boolean = false;

  constructor(credentials: EmailCredentials) {
    if (!credentials.imapConfig) {
      throw new Error('IMAP configuration missing');
    }

    this.credentials = credentials;

    this.imap = new Imap({
      user: credentials.imapConfig.username,
      password: credentials.imapConfig.password,
      host: credentials.imapConfig.host,
      port: credentials.imapConfig.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }, // For testing; use true in production
      connTimeout: 10000,
      authTimeout: 5000,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.imap.on('error', (err) => {
      console.error('IMAP error:', err);
    });

    this.imap.on('expunge', (seqno) => {
      console.log('Message expunged:', seqno);
    });
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('Authentication failed:', err);
          resolve(false);
        } else {
          this.authenticated = true;
          resolve(true);
        }
      });
    });
  }

  async fetchEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    return new Promise((resolve, reject) => {
      const limit = options?.limit || 20;
      const unreadOnly = options?.unreadOnly || false;
      const folder = options?.folder || 'INBOX';

      this.imap.openBox(folder, false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const searchCriteria = unreadOnly ? ['UNSEEN'] : ['ALL'];
        
        this.imap.search(searchCriteria, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (results.length === 0) {
            resolve([]);
            return;
          }

          // Fetch most recent emails (limit to specified amount)
          const toFetch = results.slice(-limit).reverse();
          const emails: ParsedEmail[] = [];
          let processed = 0;

          const f = this.imap.fetch(toFetch, { bodies: '' });

          f.on('message', (msg, seqno) => {
            this.parseMessage(msg, seqno)
              .then((email) => {
                if (email) {
                  emails.push(email);
                }
                processed++;
                if (processed === toFetch.length) {
                  // All messages processed, sort by date descending
                  emails.sort((a, b) => b.date.getTime() - a.date.getTime());
                  resolve(emails);
                }
              })
              .catch((err) => {
                console.error('Error parsing message:', err);
                processed++;
              });
          });

          f.on('error', (err) => {
            reject(err);
          });
        });
      });
    });
  }

  private async parseMessage(msg: any, seqno: number): Promise<ParsedEmail | null> {
    return new Promise((resolve) => {
      simpleParser(msg, async (err, parsed) => {
        if (err) {
          console.error('Parse error:', err);
          resolve(null);
          return;
        }

        try {
          const from = parsed.from?.text || 'Unknown';
          const [displayName, email] = this.parseEmailAddress(from);

          const email_obj: ParsedEmail = {
            id: `imap-${seqno}-${Date.now()}`,
            from: {
              name: displayName,
              email: email,
            },
            subject: parsed.subject || '(No subject)',
            preview: this.getPreview(parsed.text || parsed.html || ''),
            date: parsed.date || new Date(),
            read: !parsed.flags?.includes('\\Unseen'),
            providerName: this.getProviderInfo().displayName,
            body: parsed.text,
            html: parsed.html,
          };

          if (parsed.attachments && parsed.attachments.length > 0) {
            email_obj.attachments = parsed.attachments.map((att) => ({
              filename: att.filename || 'unknown',
              size: att.size || 0,
              contentType: att.contentType || 'application/octet-stream',
            }));
          }

          resolve(email_obj);
        } catch (err) {
          console.error('Error creating email object:', err);
          resolve(null);
        }
      });
    });
  }

  private parseEmailAddress(addressStr: string): [string, string] {
    // Format: "Name <email@example.com>" or just "email@example.com"
    const match = addressStr.match(/(.+?)\s*<(.+?)>/);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
    return [addressStr, addressStr];
  }

  private getPreview(text: string, length: number = 100): string {
    return text
      .replace(/\n/g, ' ')
      .substring(0, length)
      .trim() + (text.length > length ? '...' : '');
  }

  async markAsRead(emailId: string, read: boolean): Promise<void> {
    // This is complex with IMAP as it requires finding the message by UID
    // Implementation depends on how we store email UIDs
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.imap.end();
      this.authenticated = false;
      resolve();
    });
  }

  getProviderInfo() {
    return {
      type: 'imap' as const,
      displayName: this.credentials.provider.charAt(0).toUpperCase() + this.credentials.provider.slice(1),
      email: this.credentials.email,
    };
  }
}
