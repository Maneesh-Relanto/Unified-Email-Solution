import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Email Search & Filter Advanced', () => {
  describe('Full Text Search', () => {
    it('should search emails by subject', () => {
      const emails = [
        { id: '1', subject: 'Project Meeting Tomorrow' },
        { id: '2', subject: 'Budget Review' },
        { id: '3', subject: 'Meeting Minutes' },
      ];

      const results = emails.filter(e => e.subject.toLowerCase().includes('meeting'));
      expect(results).toHaveLength(2);
    });

    it('should search emails by body content', () => {
      const emails = [
        { id: '1', body: 'Important project details' },
        { id: '2', body: 'Budget spreadsheet attached' },
      ];

      const results = emails.filter(e => e.body.includes('project'));
      expect(results).toHaveLength(1);
    });

    it('should search by sender email', () => {
      const emails = [
        { id: '1', from: 'john@company.com', subject: 'Update' },
        { id: '2', from: 'jane@company.com', subject: 'Review' },
      ];

      const results = emails.filter(e => e.from.includes('john'));
      expect(results).toHaveLength(1);
    });

    it('should perform case-insensitive search', () => {
      const emails = [{ id: '1', subject: 'URGENT: Action Required' }];
      const searchText = 'urgent';
      
      const results = emails.filter(e => 
        e.subject.toLowerCase().includes(searchText.toLowerCase())
      );
      
      expect(results).toHaveLength(1);
    });

    it('should search with multiple keywords (AND)', () => {
      const emails = [
        { id: '1', subject: 'Meeting Notes Budget', tags: ['meeting', 'budget'] },
        { id: '2', subject: 'Budget Review Only', tags: ['budget'] },
      ];

      const keywords = ['meeting', 'budget'];
      const results = emails.filter(e => 
        keywords.every(kw => 
          e.subject.toLowerCase().includes(kw) || e.tags.includes(kw)
        )
      );

      expect(results).toHaveLength(1);
    });

    it('should search with OR logic', () => {
      const emails = [
        { id: '1', from: 'john@example.com' },
        { id: '2', from: 'jane@example.com' },
        { id: '3', from: 'bob@other.com' },
      ];

      const senders = ['john@example.com', 'jane@example.com'];
      const results = emails.filter(e => senders.includes(e.from));

      expect(results).toHaveLength(2);
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by date range', () => {
      const emails = [
        { id: '1', date: new Date('2026-02-05T10:00:00Z') },
        { id: '2', date: new Date('2026-02-07T10:00:00Z') },
        { id: '3', date: new Date('2026-02-10T10:00:00Z') },
      ];

      const startDate = new Date('2026-02-06T00:00:00Z');
      const endDate = new Date('2026-02-09T23:59:59Z');

      const filtered = emails.filter(e => 
        e.date >= startDate && e.date <= endDate
      );

      expect(filtered).toHaveLength(1);
    });

    it('should filter by read/unread status', () => {
      const emails = [
        { id: '1', read: true },
        { id: '2', read: false },
        { id: '3', read: false },
      ];

      const unread = emails.filter(e => !e.read);
      expect(unread).toHaveLength(2);
    });

    it('should filter by attachment presence', () => {
      const emails = [
        { id: '1', hasAttachment: true },
        { id: '2', hasAttachment: false },
        { id: '3', hasAttachment: true },
      ];

      const withAttachments = emails.filter(e => e.hasAttachment);
      expect(withAttachments).toHaveLength(2);
    });

    it('should filter by multiple providers', () => {
      const emails = [
        { id: '1', provider: 'gmail', from: 'user@gmail.com' },
        { id: '2', provider: 'outlook', from: 'user@outlook.com' },
        { id: '3', provider: 'gmail', from: 'user2@gmail.com' },
      ];

      const providers = ['gmail', 'outlook'];
      const filtered = emails.filter(e => providers.includes(e.provider));

      expect(filtered).toHaveLength(3);
    });

    it('should filter with priority levels', () => {
      const emails = [
        { id: '1', priority: 'high' },
        { id: '2', priority: 'normal' },
        { id: '3', priority: 'high' },
      ];

      const important = emails.filter(e => e.priority === 'high');
      expect(important).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const emails = [
        { id: '1', provider: 'gmail', read: false, priority: 'high' },
        { id: '2', provider: 'gmail', read: true, priority: 'high' },
        { id: '3', provider: 'outlook', read: false, priority: 'normal' },
      ];

      const filtered = emails.filter(e => 
        e.provider === 'gmail' && !e.read && e.priority === 'high'
      );

      expect(filtered).toHaveLength(1);
    });
  });

  describe('Sorting & Ordering', () => {
    it('should sort by date descending (newest first)', () => {
      const emails = [
        { id: '1', date: new Date('2026-02-05') },
        { id: '3', date: new Date('2026-02-10') },
        { id: '2', date: new Date('2026-02-07') },
      ];

      const sorted = [...emails].sort((a, b) => b.date.getTime() - a.date.getTime());

      expect(sorted[0].id).toBe('3');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });

    it('should sort by sender name', () => {
      const emails = [
        { id: '1', from: 'charlie@example.com' },
        { id: '2', from: 'alice@example.com' },
        { id: '3', from: 'bob@example.com' },
      ];

      const sorted = [...emails].sort((a, b) => a.from.localeCompare(b.from));

      expect(sorted[0].from).toBe('alice@example.com');
      expect(sorted[2].from).toBe('charlie@example.com');
    });

    it('should sort by read status (unread first)', () => {
      const emails = [
        { id: '1', read: true },
        { id: '2', read: false },
        { id: '3', read: false },
      ];

      const sorted = [...emails].sort((a, b) => 
        (a.read ? 1 : 0) - (b.read ? 1 : 0)
      );

      expect(sorted[0].read).toBe(false);
      expect(sorted[2].read).toBe(true);
    });

    it('should customize sort order', () => {
      const emails = [
        { id: '1', priority: 'low' },
        { id: '2', priority: 'high' },
        { id: '3', priority: 'normal' },
      ];

      const priorityOrder = { high: 1, normal: 2, low: 3 };
      const sorted = [...emails].sort((a, b) => 
        priorityOrder[a.priority as keyof typeof priorityOrder] - 
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );

      expect(sorted[0].priority).toBe('high');
    });
  });

  describe('Search Performance', () => {
    it('should handle large email dataset', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: String(i),
        subject: `Email ${i}`,
      }));

      const startTime = performance.now();
      const results = largeDataset.filter(e => e.subject.includes('500'));
      const endTime = performance.now();

      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // < 100ms
    });

    it('should debounce search input', () => {
      vi.useFakeTimers();
      const searches: string[] = [];
      let timeout: ReturnType<typeof setTimeout>;
      
      const debouncedSearch = (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => searches.push(query), 300);
      };

      debouncedSearch('test');
      debouncedSearch('test2');
      debouncedSearch('test3');

      vi.advanceTimersByTime(300);
      expect(searches).toHaveLength(1);
      expect(searches[0]).toBe('test3');

      vi.useRealTimers();
    });

    it('should cache search results', () => {
      const cache = new Map<string, any[]>();
      const query = 'important';

      const cachedSearch = (q: string) => {
        if (cache.has(q)) return cache.get(q);
        // ... perform search
        cache.set(q, []);
        return [];
      };

      cachedSearch(query);
      expect(cache.has(query)).toBe(true);
    });
  });
});
