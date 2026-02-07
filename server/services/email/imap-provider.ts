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

    console.log('[IMAP] Creating IMAP instance with config:', {
      user: credentials.imapConfig.username,
      host: credentials.imapConfig.host,
      port: credentials.imapConfig.port,
      tls: true,
      authTimeout: 5000,
      connTimeout: 10000,
    });

    // Create debug logger that definitely outputs
    const debugLogger = (msg: string) => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[IMAP-DEBUG]', msg);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // Also write to stderr to ensure visibility
      process.stderr.write(`[IMAP-DEBUG] ${msg}\n`);
    };

    this.imap = new Imap({
      user: credentials.imapConfig.username,
      password: credentials.imapConfig.password,
      host: credentials.imapConfig.host,
      port: credentials.imapConfig.port,
      tls: true,
      tlsOptions: { 
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connTimeout: 10000,
      authTimeout: 5000,
      debug: debugLogger, // Enable detailed debug logging with enhanced output
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    console.log('[IMAP] 📡 Setting up global event listeners...');
    
    this.imap.on('error', (err) => {
      console.error('\n❌❌❌ [IMAP ERROR EVENT] ❌❌❌');
      console.error('[IMAP] Error message:', err?.message);
      console.error('[IMAP] Error code:', err?.code);
      console.error('[IMAP] Error syscall:', err?.syscall);
      console.error('[IMAP] Error stack:', err?.stack);
      console.error('[IMAP] Full error object:', JSON.stringify(err, null, 2));
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
    });

    this.imap.on('expunge', (seqno) => {
      console.log('[IMAP] 📧 Message expunged:', seqno);
    });

    this.imap.on('alert', (msg) => {
      console.log('[IMAP] ⚠️  ALERT:', msg);
    });
    
    console.log('[IMAP] ✅ Global listeners set up complete');
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;

      console.log('[IMAP] ========== AUTHENTICATION START ==========');
      console.log('[IMAP] Email:', this.credentials.email);
      console.log('[IMAP] Provider:', this.credentials.provider);
      console.log('[IMAP] IMAP Host:', this.credentials.imapConfig?.host);
      console.log('[IMAP] IMAP Port:', this.credentials.imapConfig?.port);
      console.log('[IMAP] Username:', this.credentials.imapConfig?.username);

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[IMAP] ❌ TIMEOUT after 20 seconds');
          try {
            this.imap.end();
          } catch (e) {
            console.error('[IMAP] Error ending connection on timeout:', e);
          }
          resolve(false);
        }
      }, 20000);

      try {
        // Set up all event listeners BEFORE connecting
        console.log('\n🔵🔵🔵 [IMAP] Setting up authentication event listeners... 🔵🔵🔵\n');

        this.imap.on('ready', () => {
          console.log('\n✅✅✅ [IMAP] READY EVENT FIRED ✅✅✅');
          console.log('[IMAP] Connection authenticated successfully!');
          console.log('[IMAP] Server is ready to accept commands\n');
          
          // NOW we can open the mailbox
          console.log('[IMAP] 📬 Attempting to open INBOX...');
          this.imap.openBox('INBOX', false, (err, box) => {
            if (!resolved) {
              clearTimeout(timeout);
              resolved = true;

              if (err) {
                console.error('[IMAP] ❌ Failed to open INBOX:', err.message);
                console.error('[IMAP] Error details:', {
                  code: err.code,
                  errno: err.errno,
                });
                try {
                  this.imap.end();
                } catch (e) {
                  console.error('[IMAP] Error ending connection:', e);
                }
                resolve(false);
              } else {
                console.log('[IMAP] ✅✅ SUCCESS! Mailbox opened');
                console.log('[IMAP] Mailbox name:', box?.name);
                console.log('[IMAP] Total messages:', box?.messages?.total);
                console.log('[IMAP] ========== AUTHENTICATION SUCCESS ==========');
                this.authenticated = true;
                resolve(true);
              }
            }
          });
        });

        this.imap.on('error', (err: any) => {
          console.error('\n🔴🔴🔴 [IMAP] ERROR EVENT FIRED DURING AUTH 🔴🔴🔴');
          console.error('[IMAP] Error message:', err?.message);
          console.error('[IMAP] Error code:', err?.code);
          console.error('[IMAP] Error source:', err?.source);
          console.error('[IMAP] Error syscall:', err?.syscall);
          console.error('[IMAP] Error errno:', err?.errno);
          console.error('[IMAP] Error textCode:', err?.textCode);
          
          // Check for specific Outlook/Microsoft errors
          if (err?.textCode?.key) {
            const errorKey = err.textCode.key.toString();
            
            if (errorKey.includes('BasicAuthBlocked')) {
              console.error('\n🚨🚨🚨 MICROSOFT BASIC AUTH BLOCKED 🚨🚨🚨');
              console.error('┌─────────────────────────────────────────────────────────┐');
              console.error('│ Microsoft is blocking basic authentication (username/  │');
              console.error('│ password) for IMAP access to this Outlook account.     │');
              console.error('│                                                         │');
              console.error('│ SOLUTION: Generate an App Password                     │');
              console.error('│ 1. Go to: account.microsoft.com → Security            │');
              console.error('│ 2. Enable 2-step verification (if not already on)     │');
              console.error('│ 3. Generate "App password" for "Mail"                 │');
              console.error('│ 4. Use that app password instead of regular password  │');
              console.error('└─────────────────────────────────────────────────────────┘\n');
            }
            
            if (errorKey.includes('LogonDenied')) {
              console.error('⚠️  Login denied by server');
            }
            
            if (errorKey.includes('AuthFailed')) {
              console.error('⚠️  Authentication failed on server side');
            }
          } else if (err?.message === 'LOGIN failed.') {
            // Generic login failure - likely IMAP not enabled or wrong credentials
            console.error('\n⚠️⚠️⚠️  GENERIC LOGIN FAILURE ⚠️⚠️⚠️');
            console.error('┌─────────────────────────────────────────────────────────┐');
            console.error('│ The server rejected the login credentials.             │');
            console.error('│                                                         │');
            console.error('│ MOST COMMON CAUSES:                                    │');
            console.error('│ 1. IMAP not enabled in Outlook settings (MOST LIKELY) │');
            console.error('│ 2. Incorrect app password                              │');
            console.error('│ 3. App password expired                                │');
            console.error('│ 4. Wrong email address                                 │');
            console.error('│                                                         │');
            console.error('│ FIRST ACTION: Enable IMAP                              │');
            console.error('│ • outlook.com → Settings → Sync email                  │');
            console.error('│ • Enable "Let devices and apps use IMAP"               │');
            console.error('│ • Wait 2-3 minutes and try again                       │');
            console.error('└─────────────────────────────────────────────────────────┘\n');
          }
          
          console.error('[IMAP] Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
          console.error('[IMAP] Stack trace:', err?.stack);
          console.error('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n');
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            try {
              this.imap.end();
            } catch (e) {
              console.error('[IMAP] Error ending connection:', e);
            }
            resolve(false);
          }
        });

        this.imap.on('end', () => {
          console.log('\n⚪ [IMAP] END event - connection closed by server');
        });

        this.imap.on('close', (hadError: boolean) => {
          console.log('\n⚪ [IMAP] CLOSE event - connection terminated', hadError ? '❌ WITH ERROR' : '✅ normally');
          if (hadError) {
            console.log('[IMAP] Connection closed due to error condition');
          }
        });

        // CRITICAL: Actually initiate the connection!
        console.log('\n🚀🚀🚀 [IMAP] INITIATING CONNECTION 🚀🚀🚀');
        console.log('[IMAP] Target:', this.credentials.imapConfig?.host + ':' + this.credentials.imapConfig?.port);
        console.log('[IMAP] User:', this.credentials.imapConfig?.username);
        console.log('[IMAP] TLS: Enabled');
        console.log('[IMAP] Calling connect() now...\n');
        
        this.imap.connect();
        
        console.log('\n✅ [IMAP] connect() method called successfully');
        console.log('[IMAP] Waiting for server response...');
        console.log('[IMAP] Expecting: ready, error, end, or close events\n');

      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('[IMAP] ❌ EXCEPTION during authentication setup:', error);
          try {
            this.imap.end();
          } catch (e) {
            console.error('[IMAP] Error ending connection:', e);
          }
          resolve(false);
        }
      }
    });
  }

  async fetchEmails(options?: FetchEmailsOptions): Promise<ParsedEmail[]> {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    return new Promise((resolve, reject) => {
      const limit = options?.limit || 20;
      const skip = options?.skip || 0;
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

          // Fetch most recent emails (with limit and skip)
          // Results array has newest emails at the end
          // To skip N and get limit M: slice(-(limit + skip), skip > 0 ? -skip : undefined)
          const startIdx = -(limit + skip);
          const endIdx = skip > 0 ? -skip : undefined;
          const toFetch = results.slice(startIdx, endIdx).reverse();
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
      try {
        if (this.imap) {
          this.imap.end();
          this.imap.destroy();
        }
        this.authenticated = false;
        resolve();
      } catch (error) {
        console.error('Error during disconnect:', error);
        this.authenticated = false;
        resolve();
      }
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
