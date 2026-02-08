import { describe, it, expect } from 'vitest';

/**
 * Test suite for email parsing and utility functions
 */

describe('Email Parsing Utilities', () => {
  describe('Email address extraction', () => {
    const extractEmail = (from: string): string => {
      // Extract email from various formats
      const emailRegex = /<([^>]*)>|([^<"]*@[^>"]*)/;
      const match = from.match(emailRegex);
      return match ? (match[1] || match[2] || '').trim() : '';
    };

    it('should extract email from angle bracket format', () => {
      expect(extractEmail('<john@example.com>')).toBe('john@example.com');
      expect(extractEmail('John Doe <john@example.com>')).toBe('john@example.com');
      expect(extractEmail('"John Doe" <john@example.com>')).toBe('john@example.com');
    });

    it('should extract email from plain format', () => {
      expect(extractEmail('john@example.com')).toBe('john@example.com');
      expect(extractEmail('test.user+tag@sub.example.com')).toBe('test.user+tag@sub.example.com');
    });

    it('should handle malformed email addresses gracefully', () => {
      expect(extractEmail('no-email-here')).toBe('');
      expect(extractEmail('')).toBe('');
      expect(extractEmail('incomplete@')).toBe('incomplete@');
    });

    it('should extract email from complex format', () => {
      expect(extractEmail('=?UTF-8?Q?John=20Doe?= <john@example.com>')).toBe('john@example.com');
    });
  });

  describe('Date parsing and sorting', () => {
    const parseEmailDate = (dateString: string): Date => {
      return new Date(dateString);
    };

    const sortEmailsByDate = (emails: Array<{date: Date}>): Array<{date: Date}> => {
      return [...emails].sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    it('should parse RFC 2822 email dates', () => {
      const date = parseEmailDate('Mon, 08 Feb 2026 12:00:00 +0000');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(8);
    });

    it('should parse ISO 8601 dates', () => {
      const date = parseEmailDate('2026-02-08T12:00:00Z');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1);
    });

    it('should sort emails by date in descending order', () => {
      const emails = [
        { date: new Date('2026-01-01') },
        { date: new Date('2026-01-03') },
        { date: new Date('2026-01-02') },
      ];

      const sorted = sortEmailsByDate(emails);

      expect(sorted[0].date.getDate()).toBe(3);
      expect(sorted[1].date.getDate()).toBe(2);
      expect(sorted[2].date.getDate()).toBe(1);
    });

    it('should handle same-day emails preserving relative order', () => {
      const emails = [
        { date: new Date('2026-02-08T10:00:00Z') },
        { date: new Date('2026-02-08T11:00:00Z') },
        { date: new Date('2026-02-08T09:00:00Z') },
      ];

      const sorted = sortEmailsByDate(emails);

      expect(sorted[0].date.getUTCHours()).toBe(11);
      expect(sorted[1].date.getUTCHours()).toBe(10);
      expect(sorted[2].date.getUTCHours()).toBe(9);
    });
  });

  describe('Subject line normalization', () => {
    const normalizeSubject = (subject: string): string => {
      // Remove "Re:", "Fwd:", etc. and trim
      return subject
        .replace(/^(re|fwd|fw|vs|vs\.):\s*/i, '')
        .trim()
        .substring(0, 200); // Limit length
    };

    it('should remove Re: prefix (case insensitive)', () => {
      expect(normalizeSubject('Re: Hello')).toBe('Hello');
      expect(normalizeSubject('RE: Hello')).toBe('Hello');
      expect(normalizeSubject('re: Hello')).toBe('Hello');
    });

    it('should remove Fwd: prefix variations', () => {
      expect(normalizeSubject('Fwd: Hello')).toBe('Hello');
      expect(normalizeSubject('FW: Hello')).toBe('Hello');
      expect(normalizeSubject('Fw: Hello')).toBe('Hello');
    });

    it('should handle multiple prefixes', () => {
      expect(normalizeSubject('Re: Fwd: Hello')).toBe('Fwd: Hello');
    });

    it('should trim whitespace', () => {
      expect(normalizeSubject('  Hello  ')).toBe('Hello');
      expect(normalizeSubject('Re:   Hello')).toBe('Hello');
    });

    it('should limit subject length to 200 characters', () => {
      const longSubject = 'A'.repeat(250);
      const result = normalizeSubject(longSubject);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result).toBe('A'.repeat(200));
    });
  });

  describe('Email body snippet generation', () => {
    const generateSnippet = (body: string, maxLength: number = 100): string => {
      const cleaned = body
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      const truncated = cleaned.substring(0, maxLength);
      return cleaned.length > maxLength ? truncated + '...' : cleaned;
    };

    it('should remove HTML tags from body', () => {
      expect(generateSnippet('<p>Hello <b>World</b></p>', 50)).toBe('Hello World');
    });

    it('should normalize whitespace', () => {
      expect(generateSnippet('Hello   \n\n  World', 50)).toBe('Hello World');
    });

    it('should truncate long content', () => {
      const longText = 'A'.repeat(150);
      const snippet = generateSnippet(longText, 100);
      expect(snippet.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(snippet.endsWith('...')).toBe(true);
    });

    it('should not add ellipsis for short content', () => {
      expect(generateSnippet('Short')).toBe('Short');
    });

    it('should handle complex HTML', () => {
      const html = `
        <html>
          <body>
            <div class="email">
              <p>This is a <strong>test</strong> email.</p>
              <p>With <em>multiple</em> paragraphs.</p>
            </div>
          </body>
        </html>
      `;
      const snippet = generateSnippet(html, 50);
      expect(snippet).not.toContain('<');
      expect(snippet).not.toContain('>');
    });
  });

  describe('Email address validation', () => {
    const isValidEmail = (email: string): boolean => {
      // RFC 5322 simplified pattern
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(email) && email.length <= 254;
    };

    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should reject excessively long addresses', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should accept maximum length valid email', () => {
      const validEmail = 'a'.repeat(240) + '@example.com';
      expect(isValidEmail(validEmail)).toBe(true);
    });
  });

  describe('Attachment detection', () => {
    const hasAttachments = (contentDisposition: string, contentType: string): boolean => {
      return contentDisposition?.includes('attachment') || 
             contentType?.includes('multipart');
    };

    it('should detect attachment from Content-Disposition header', () => {
      expect(hasAttachments('attachment; filename="file.pdf"', '')).toBe(true);
      expect(hasAttachments('attachment', '')).toBe(true);
    });

    it('should detect multipart content', () => {
      expect(hasAttachments('', 'multipart/mixed')).toBe(true);
      expect(hasAttachments('', 'multipart/alternative')).toBe(true);
    });

    it('should not detect attachments in inline content', () => {
      expect(hasAttachments('inline', 'text/plain')).toBe(false);
      expect(hasAttachments('', 'text/html')).toBe(false);
    });
  });

  describe('Email categorization', () => {
    const categorizeEmail = (
      subject: string,
      from: string,
    ): 'promotions' | 'updates' | 'social' | 'primary' => {
      const lowerSubject = subject.toLowerCase();
      const lowerFrom = from.toLowerCase();

      if (lowerSubject.includes('unsubscribe') || lowerFrom.includes('promo')) {
        return 'promotions';
      }
      if (lowerSubject.match(/notification|alert|update|confirm/)) {
        return 'updates';
      }
      if (lowerSubject.includes('comment') || lowerFrom.includes('facebook')) {
        return 'social';
      }
      return 'primary';
    };

    it('should categorize promotional emails', () => {
      expect(categorizeEmail('Special Offer with unsubscribe', 'store@example.com')).toBe('promotions');
      expect(categorizeEmail('New Product', 'promo@example.com')).toBe('promotions');
    });

    it('should categorize update notifications', () => {
      expect(categorizeEmail('Your notification is ready', 'user@gmail.com')).toBe('updates');
      expect(categorizeEmail('Alert: Security update', 'admin@example.com')).toBe('updates');
    });

    it('should categorize social emails', () => {
      expect(categorizeEmail('John commented on your post', 'notify@facebook.com')).toBe('social');
    });

    it('should default to primary not matches', () => {
      expect(categorizeEmail('Regular email subject', 'friend@example.com')).toBe('primary');
    });
  });
});
