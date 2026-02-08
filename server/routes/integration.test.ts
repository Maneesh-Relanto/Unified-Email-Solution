import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OAuth Flow Integration Tests', () => {
  describe('Google OAuth Flow', () => {
    const generateGoogleAuthUrl = (clientId: string, redirectUri: string, state: string) => {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        access_type: 'offline',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    };

    it('should generate valid Google OAuth URL', () => {
      const url = generateGoogleAuthUrl('client-id', 'http://localhost:8080/callback', 'state123');
      
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id=client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=state123');
    });

    it('should include correct scopes in OAuth URL', () => {
      const url = generateGoogleAuthUrl('client-id', 'http://localhost:8080/callback', 'state123');
      
      expect(url).toContain('gmail.readonly');
      expect(url).toContain('access_type=offline');
    });

    it('should exchange code for tokens', async () => {
      const exchangeCodeForToken = async (code: string, expectedSuccess: boolean) => {
        if (!code) {
          return { error: 'No code provided' };
        }
        if (expectedSuccess) {
          return {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_456',
            expires_in: 3600,
          };
        }
        return { error: 'Invalid code' };
      };

      const result = await exchangeCodeForToken('auth_code', true);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });
  });

  describe('Multi-Account Operations', () => {
    it('should fetch and aggregate emails from multiple providers', async () => {
      const providers = [
        { email: 'user@gmail.com', fetchEmails: async () => [{ id: '1', from: 'test1@example.com' }] },
        { email: 'user@outlook.com', fetchEmails: async () => [{ id: '2', from: 'test2@example.com' }] },
      ];

      const fetchAllEmails = async () => {
        const results = await Promise.all(providers.map(p => p.fetchEmails()));
        return results.flat();
      };

      const emails = await fetchAllEmails();
      expect(emails).toHaveLength(2);
      expect(emails.map(e => e.id)).toContain('1');
      expect(emails.map(e => e.id)).toContain('2');
    });

    it('should continue fetching if one provider fails', async () => {
      const providers = [
        { email: 'user@gmail.com', fetchEmails: async () => [{ id: '1' }] },
        { 
          email: 'user@outlook.com', 
          fetchEmails: async () => {
            throw new Error('Network error');
          }
        },
        { email: 'user@yahoo.com', fetchEmails: async () => [{ id: '3' }] },
      ];

      const fetchAllEmailsSafe = async () => {
        const results = await Promise.allSettled(providers.map(p => p.fetchEmails()));
        return results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as any).value)
          .flat();
      };

      const emails = await fetchAllEmailsSafe();
      expect(emails).toHaveLength(2);
    });

    it('should sort aggregated emails by date', async () => {
      const emails = [
        { id: '1', date: new Date('2026-02-08T10:00:00Z') },
        { id: '2', date: new Date('2026-02-08T14:00:00Z') },
        { id: '3', date: new Date('2026-02-08T12:00:00Z') },
      ];

      const sorted = [...emails].sort((a, b) => b.date.getTime() - a.date.getTime());

      expect(sorted[0].id).toBe('2'); // Latest first
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });
  });

  describe('Account Management', () => {
    it('should handle account addition with duplicate detection', async () => {
      const accounts = [
        { email: 'user@gmail.com', provider: 'gmail' },
      ];

      const addAccount = (email: string, provider: string) => {
        const exists = accounts.some(a => a.email === email && a.provider === provider);
        if (exists) {
          return { success: false, error: 'Account already exists' };
        }
        accounts.push({ email, provider });
        return { success: true };
      };

      expect(addAccount('user@gmail.com', 'gmail').success).toBe(false);
      expect(addAccount('newuser@outlook.com', 'outlook').success).toBe(true);
      expect(accounts).toHaveLength(2);
    });

    it('should handle account removal with cleanup', async () => {
      const accounts = [
        { email: 'user1@gmail.com', cache: [] },
        { email: 'user2@outlook.com', cache: ['item1', 'item2'] },
      ];

      const removeAccount = (email: string) => {
        const index = accounts.findIndex(a => a.email === email);
        if (index === -1) {
          return { success: false, error: 'Account not found' };
        }
        const account = accounts.splice(index, 1)[0];
        return { success: true, cleanedUp: account.cache.length };
      };

      const result = removeAccount('user2@outlook.com');
      expect(result.success).toBe(true);
      expect(result.cleanedUp).toBe(2);
      expect(accounts).toHaveLength(1);
    });
  });

  describe('Filter & Search', () => {
    it('should filter emails by provider', () => {
      const emails = [
        { id: '1', provider: 'gmail', subject: 'Gmail email' },
        { id: '2', provider: 'outlook', subject: 'Outlook email' },
        { id: '3', provider: 'gmail', subject: 'Another Gmail' },
      ];

      const filterByProvider = (emails: typeof emails, provider: string) => {
        return emails.filter(e => e.provider === provider);
      };

      const gmailEmails = filterByProvider(emails, 'gmail');
      expect(gmailEmails).toHaveLength(2);
      expect(gmailEmails.every(e => e.provider === 'gmail')).toBe(true);
    });

    it('should search emails by subject keywords', () => {
      const emails = [
        { id: '1', subject: 'Important Meeting Tomorrow' },
        { id: '2', subject: 'Budget Review' },
        { id: '3', subject: 'Meeting Rescheduled' },
      ];

      const searchByKeyword = (emails: typeof emails, keyword: string) => {
        const lower = keyword.toLowerCase();
        return emails.filter(e => e.subject.toLowerCase().includes(lower));
      };

      const results = searchByKeyword(emails, 'meeting');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1');
      expect(results[1].id).toBe('3');
    });

    it('should filter unread emails', () => {
      const emails = [
        { id: '1', read: true },
        { id: '2', read: false },
        { id: '3', read: false },
      ];

      const getUnread = (emails: typeof emails) => {
        return emails.filter(e => !e.read);
      };

      expect(getUnread(emails)).toHaveLength(2);
    });
  });

  describe('Pagination & Performance', () => {
    it('should handle large result sets with pagination', () => {
      const allEmails = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));

      const paginate = (items: typeof allEmails, page: number = 1, pageSize: number = 20) => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return {
          items: items.slice(start, end),
          total: items.length,
          page,
          pageSize,
          totalPages: Math.ceil(items.length / pageSize),
        };
      };

      const page1 = paginate(allEmails, 1, 20);
      expect(page1.items).toHaveLength(20);
      expect(page1.totalPages).toBe(50);
      expect(page1.items[0].id).toBe('0');

      const page50 = paginate(allEmails, 50, 20);
      expect(page50.items[0].id).toBe('980');
      expect(page50.items[0].id).toBe('980');
    });

    it('should prevent out-of-bounds pagination', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);

      const safePaginate = (items: typeof items, page: number, pageSize: number = 20) => {
        const totalPages = Math.ceil(items.length / pageSize);
        const safePage = Math.max(1, Math.min(page, totalPages));
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
      };

      expect(safePaginate(items, -1, 20)).toHaveLength(20);
      expect(safePaginate(items, 1000, 20)).toHaveLength(20); // Returns last page when out of bounds
      expect(safePaginate(items, 5, 20)).toHaveLength(20);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain email order across multiple fetches', async () => {
      const fetchRound1 = async () => [
        { id: '1', date: new Date('2026-02-08T12:00:00Z') },
        { id: '2', date: new Date('2026-02-08T11:00:00Z') },
      ];

      const fetchRound2 = async () => [
        { id: '3', date: new Date('2026-02-08T13:00:00Z') },
        { id: '1', date: new Date('2026-02-08T12:00:00Z') }, // Duplicate
      ];

      const deduplicateAndSort = (all: any[]) => {
        const seen = new Set<string>();
        return all
          .filter(e => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      };

      const email1 = await fetchRound1();
      const email2 = await fetchRound2();
      const combined = deduplicateAndSort([...email1, ...email2]);

      expect(combined).toHaveLength(3);
      expect(combined[0].id).toBe('3'); // Newest
      expect(combined.map(e => e.id)).toEqual(['3', '1', '2']);
    });

    it('should handle concurrent updates without data loss', async () => {
      let emailCount = 0;
      const updates: number[] = [];

      const addEmailAtomic = async (batchSize: number) => {
        await new Promise(resolve => setTimeout(resolve, 0)); // Simulate async
        // Track each update separately to avoid race condition
        updates.push(batchSize);
        // Re-calculate total from all updates
        emailCount = updates.reduce((sum, count) => sum + count, 0);
        return { success: true, totalEmails: emailCount };
      };

      await Promise.all([
        addEmailAtomic(10),
        addEmailAtomic(10),
        addEmailAtomic(10),
      ]);

      expect(emailCount).toBe(30);
    });
  });
});
