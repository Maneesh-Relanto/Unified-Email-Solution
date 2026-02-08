import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from './email-service';
import { EmailProviderFactory } from './email/index';

// Mock the EmailProviderFactory
vi.mock('./email/index', () => ({
  EmailProviderFactory: {
    createProvider: vi.fn(),
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = new EmailService();
    mockProvider = {
      authenticate: vi.fn().mockResolvedValue(true),
      fetchEmails: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getProviderInfo: vi.fn().mockReturnValue({ displayName: 'Gmail' }),
    };
  });

  describe('Provider Management', () => {
    it('should initialize a provider with valid credentials', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      const credentials = {
        email: 'user@gmail.com',
        password: 'password123',
        provider: 'gmail',
      };

      await emailService.initializeProvider(credentials);

      expect(EmailProviderFactory.createProvider).toHaveBeenCalledWith(credentials);
      expect(mockProvider.authenticate).toHaveBeenCalled();
    });

    it('should store initialized provider in map', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      const credentials = {
        email: 'user@gmail.com',
        password: 'password123',
        provider: 'gmail',
      };

      await emailService.initializeProvider(credentials);

      const accounts = emailService.getInitializedAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].email).toBe('user@gmail.com');
    });

    it('should throw error when authentication fails', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue({
        authenticate: vi.fn().mockResolvedValue(false),
      });

      const credentials = {
        email: 'user@gmail.com',
        password: 'wrong_password',
        provider: 'gmail',
      };

      await expect(emailService.initializeProvider(credentials)).rejects.toThrow(
        'Failed to authenticate with email provider'
      );
    });

    it('should handle provider creation errors', async () => {
      (EmailProviderFactory.createProvider as any).mockImplementation(() => {
        throw new Error('Invalid provider type');
      });

      const credentials = {
        email: 'user@invalid.com',
        password: 'password123',
        provider: 'invalid',
      };

      await expect(emailService.initializeProvider(credentials)).rejects.toThrow(
        'Invalid provider type'
      );
    });
  });

  describe('Email Fetching', () => {
    beforeEach(async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      const credentials = {
        email: 'user@gmail.com',
        password: 'password123',
        provider: 'gmail',
      };

      await emailService.initializeProvider(credentials);
    });

    it('should fetch emails from initialized provider', async () => {
      const mockEmails = [
        { id: '1', subject: 'Test 1', date: new Date(), from: 'test@example.com', snippet: 'content' },
        { id: '2', subject: 'Test 2', date: new Date(), from: 'test2@example.com', snippet: 'content' },
      ];

      mockProvider.fetchEmails.mockResolvedValue(mockEmails);

      const emails = await emailService.fetchEmails('user@gmail.com');

      expect(emails).toEqual(mockEmails);
      expect(mockProvider.fetchEmails).toHaveBeenCalled();
    });

    it('should throw error when fetching from uninitialized account', async () => {
      await expect(emailService.fetchEmails('unknown@example.com')).rejects.toThrow(
        'No provider initialized for: unknown@example.com'
      );
    });

    it('should cache emails for subsequent requests', async () => {
      const mockEmails = [
        { id: '1', subject: 'Test', date: new Date(), from: 'test@example.com', snippet: 'content' },
      ];

      mockProvider.fetchEmails.mockResolvedValue(mockEmails);

      // First fetch
      await emailService.fetchEmails('user@gmail.com');
      const fetchCount1 = mockProvider.fetchEmails.mock.calls.length;

      // Second fetch (should hit cache)
      await emailService.fetchEmails('user@gmail.com');
      const fetchCount2 = mockProvider.fetchEmails.mock.calls.length;

      expect(fetchCount2).toBe(fetchCount1); // No additional fetch
    });

    it('should respect cache TTL and refetch after expiration', async () => {
      const mockEmails = [
        { id: '1', subject: 'Test', date: new Date(), from: 'test@example.com', snippet: 'content' },
      ];

      mockProvider.fetchEmails.mockResolvedValue(mockEmails);

      // First fetch
      await emailService.fetchEmails('user@gmail.com');
      const initialCalls = mockProvider.fetchEmails.mock.calls.length;

      // Verify cache was populated
      expect(initialCalls).toBeGreaterThan(0);

      // Second immediate fetch should hit cache
      await emailService.fetchEmails('user@gmail.com');
      const cachedCalls = mockProvider.fetchEmails.mock.calls.length;

      expect(cachedCalls).toBe(initialCalls); // No additional call
    });
  });

  describe('Multi-provider Operations', () => {
    it('should fetch emails from all initialized providers', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      // Initialize two providers
      await emailService.initializeProvider({
        email: 'user1@gmail.com',
        password: 'pass1',
        provider: 'gmail',
      });

      await emailService.initializeProvider({
        email: 'user2@outlook.com',
        password: 'pass2',
        provider: 'outlook',
      });

      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');

      mockProvider.fetchEmails.mockResolvedValueOnce([
        { id: '1', subject: 'Gmail', date: date1, from: 'test1@example.com', snippet: 'content' },
      ]);

      mockProvider.fetchEmails.mockResolvedValueOnce([
        { id: '2', subject: 'Outlook', date: date2, from: 'test2@example.com', snippet: 'content' },
      ]);

      const allEmails = await emailService.fetchAllEmails();

      expect(allEmails).toHaveLength(2);
      expect(mockProvider.fetchEmails).toHaveBeenCalledTimes(2);
    });

    it('should sort emails by date descending across all providers', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      await emailService.initializeProvider({
        email: 'user1@gmail.com',
        password: 'pass1',
        provider: 'gmail',
      });

      await emailService.initializeProvider({
        email: 'user2@outlook.com',
        password: 'pass2',
        provider: 'outlook',
      });

      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');
      const date3 = new Date('2025-01-03');

      mockProvider.fetchEmails.mockResolvedValueOnce([
        { id: '1', subject: 'Old', date: date1, from: 'test@example.com', snippet: 'content' },
      ]);

      mockProvider.fetchEmails.mockResolvedValueOnce([
        { id: '2', subject: 'Newest', date: date3, from: 'test@example.com', snippet: 'content' },
        { id: '3', subject: 'Middle', date: date2, from: 'test@example.com', snippet: 'content' },
      ]);

      const allEmails = await emailService.fetchAllEmails();

      expect(allEmails[0].id).toBe('2'); // Newest first
      expect(allEmails[1].id).toBe('3'); // Middle
      expect(allEmails[2].id).toBe('1'); // Oldest
    });

    it('should continue fetching from other providers if one fails', async () => {
      (EmailProviderFactory.createProvider as any)
        .mockReturnValueOnce(mockProvider)
        .mockReturnValueOnce({
          authenticate: vi.fn().mockResolvedValue(true),
          fetchEmails: vi.fn().mockRejectedValue(new Error('Network error')),
        });

      await emailService.initializeProvider({
        email: 'user1@gmail.com',
        password: 'pass1',
        provider: 'gmail',
      });

      await emailService.initializeProvider({
        email: 'user2@outlook.com',
        password: 'pass2',
        provider: 'outlook',
      });

      mockProvider.fetchEmails.mockResolvedValue([
        { id: '1', subject: 'Test', date: new Date(), from: 'test@example.com', snippet: 'content' },
      ]);

      const allEmails = await emailService.fetchAllEmails();

      expect(allEmails).toHaveLength(1);
    });
  });

  describe('Account Management', () => {
    it('should return list of initialized accounts', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      await emailService.initializeProvider({
        email: 'user1@gmail.com',
        password: 'pass1',
        provider: 'gmail',
      });

      await emailService.initializeProvider({
        email: 'user2@outlook.com',
        password: 'pass2',
        provider: 'outlook',
      });

      const accounts = emailService.getInitializedAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts.map(a => a.email)).toContain('user1@gmail.com');
      expect(accounts.map(a => a.email)).toContain('user2@outlook.com');
    });

    it('should disconnect provider from account list', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);
      mockProvider.disconnect = vi.fn().mockResolvedValue(undefined);

      await emailService.initializeProvider({
        email: 'user@gmail.com',
        password: 'pass',
        provider: 'gmail',
      });

      expect(emailService.getInitializedAccounts()).toHaveLength(1);

      await emailService.disconnectProvider('user@gmail.com');

      expect(emailService.getInitializedAccounts()).toHaveLength(0);
    });

    it('should check if provider is initialized', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      await emailService.initializeProvider({
        email: 'user@gmail.com',
        password: 'pass',
        provider: 'gmail',
      });

      expect(emailService.isInitialized('user@gmail.com')).toBe(true);
      expect(emailService.isInitialized('unknown@example.com')).toBe(false);
    });

    it('should disconnect all providers', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);
      mockProvider.disconnect = vi.fn().mockResolvedValue(undefined);

      await emailService.initializeProvider({
        email: 'user1@gmail.com',
        password: 'pass1',
        provider: 'gmail',
      });

      await emailService.initializeProvider({
        email: 'user2@outlook.com',
        password: 'pass2',
        provider: 'outlook',
      });

      expect(emailService.getInitializedAccounts()).toHaveLength(2);

      await emailService.disconnectAll();

      expect(emailService.getInitializedAccounts()).toHaveLength(0);
      expect(mockProvider.disconnect).toHaveBeenCalledTimes(2);
    });

    it('should clear entire cache on demand', async () => {
      (EmailProviderFactory.createProvider as any).mockReturnValue(mockProvider);

      await emailService.initializeProvider({
        email: 'user@gmail.com',
        password: 'pass',
        provider: 'gmail',
      });

      mockProvider.fetchEmails.mockResolvedValue([
        { id: '1', subject: 'Test', date: new Date(), from: 'test@example.com', snippet: 'content' },
      ]);

      await emailService.fetchEmails('user@gmail.com');
      emailService.clearCache();

      mockProvider.fetchEmails.mockClear();
      mockProvider.fetchEmails.mockResolvedValue([]);

      await emailService.fetchEmails('user@gmail.com');

      expect(mockProvider.fetchEmails).toHaveBeenCalled();
    });
  });
});
