import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { StatusBar, useStatusBar } from "@/components/StatusBar";
import { EmailLoadingTimeoutDialog } from "@/components/EmailLoadingTimeoutDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Settings, Loader, Type, RotateCcw } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import type { Email } from "@/lib/mock-emails";
import { useEmailCache } from "@/hooks/use-email-cache-hook";
import { useEmailLoadingConfig } from "@/hooks/use-email-loading-config";

/**
 * Normalize email.from field to consistent { name, email } format
 * Handles both string format "Name <email@example.com>" and object format { name, email }
 */
function normalizeEmailFrom(from: any): { name: string; email: string } {
  // If already normalized object, return as-is
  if (typeof from === 'object' && from !== null && 'name' in from && 'email' in from) {
    return {
      name: from.name || 'Unknown Sender',
      email: from.email || 'unknown@example.com',
    };
  }

  // Handle string format "Name <email@example.com>"
  if (typeof from === 'string') {
    const match = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/^(.+)$/);
    if (match) {
      if (match.length === 3) {
        // Matched "Name <email>" format
        return {
          name: match[1].trim() || 'Unknown Sender',
          email: match[2].trim() || 'unknown@example.com',
        };
      } else {
        // Only got the email or name, treat as email if it contains @
        const value = match[1].trim();
        if (value.includes('@')) {
          return {
            name: 'Unknown Sender',
            email: value,
          };
        } else {
          return {
            name: value || 'Unknown Sender',
            email: 'unknown@example.com',
          };
        }
      }
    }
  }

  // Fallback for any other format
  return {
    name: 'Unknown Sender',
    email: 'unknown@example.com',
  };
}

interface OAuthEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  providerName: string;  // e.g., 'Gmail (OAuth)', 'Outlook (OAuth)'
}

interface OAuthAccount {
  provider: string;
  email: string;
  expiresAt: number;
  isExpired: boolean;
}

interface Provider {
  id: string;
  name: string;
  icon: string;
  emails?: Email[];
  hasOAuth?: boolean;
  email?: string; // Email address for the provider account
}

/**
 * Extract provider from email's providerName field
 * Converts 'Gmail (OAuth)' to 'gmail', 'Outlook (OAuth)' to 'outlook'
 */
function getProviderFromEmail(email: Email | undefined): string {
  if (!email) return "gmail";
  const providerName = email.providerName?.toLowerCase() || "";
  if (providerName.includes("gmail")) return "gmail";
  if (providerName.includes("outlook")) return "outlook";
  return "gmail"; // Default fallback
}

export default function UnifiedInbox() {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [oauthEmails, setOauthEmails] = useState<OAuthEmail[]>([]);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [emailOffsets, setEmailOffsets] = useState<Record<string, number>>({}); // Track offset per provider
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium'); // Font size preference
  const [showCacheInfo, setShowCacheInfo] = useState(true); // Show cache status in UI
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false); // Show timeout warning dialog
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Track elapsed time for timeout
  
  // Status bar hook
  const statusBar = useStatusBar();
  
  // Email loading settings hook - provides configurable batch size and timeout
  const { config: emailLoadingConfig } = useEmailLoadingConfig();
  
  // TIER 1: Email Cache Hook - checks sessionStorage for cached emails
  const emailCache = useEmailCache(selectedProviderId);
  
  // Track current fetch request to avoid race conditions when switching providers
  const currentRequestRef = useRef<{ providerId: string; timestamp: number } | null>(null);
  
  // Track the current loading message ID so we can remove it when switching providers
  const currentLoadingIdRef = useRef<string | undefined>(undefined);
  
  // Track timeout handling
  const timeoutHandledRef = useRef<boolean>(false);
  const timeoutIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize providers from OAuth accounts on mount
  useEffect(() => {
    fetchOAuthAccounts();
  }, []);

  // Fetch emails when provider changes (only after accounts are loaded)
  useEffect(() => {
    if (!accountsLoaded) return; // Don't fetch until accounts are loaded
    
    console.log('[UnifiedInbox] Provider changed to:', selectedProviderId);
    console.log('[UnifiedInbox] Current oauthEmails count:', oauthEmails.length);
    
    // Mark the current request so we can detect out-of-order responses
    const requestTimestamp = Date.now();
    currentRequestRef.current = { providerId: selectedProviderId, timestamp: requestTimestamp };
    console.log('[UnifiedInbox] New request marked:', { providerId: selectedProviderId, timestamp: requestTimestamp });
    
    // Clear any existing loading message when switching providers
    if (currentLoadingIdRef.current) {
      statusBar.removeMessage(currentLoadingIdRef.current);
      currentLoadingIdRef.current = null;
    }
    
    // Reset offsets when switching providers
    console.log('[UnifiedInbox] Resetting email offsets');
    setEmailOffsets({});
    
    // TIER 1: Check cache first before making API call
    if (!emailCache.shouldFetchFresh && emailCache.cachedEmails && emailCache.cachedEmails.length > 0) {
      console.log('[UnifiedInbox] 📦 Using cached emails for provider:', selectedProviderId);
      console.log('[UnifiedInbox] Cache info:', emailCache.cacheStatus);
      setOauthEmails(emailCache.cachedEmails);
      
      // Show cache status in UI if enabled
      if (showCacheInfo) {
        const remaining = emailCache.cacheStatus.remainingMs || 0;
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        statusBar.showInfo(`📦 Loaded from cache (expires in ${minutes}m ${seconds}s)`);
      }
      return; // Skip API fetch since we have fresh cached data
    }
    
    if (selectedProviderId === "all") {
      console.log('[UnifiedInbox] Fetching ALL emails');
      fetchAllOAuthEmails();
    } else {
      console.log(`[UnifiedInbox] Fetching ${selectedProviderId} emails only`);
      fetchOAuthEmails(selectedProviderId);
    }
    
    // Cleanup function to clear loading message if component unmounts or provider changes
    return () => {
      if (currentLoadingIdRef.current) {
        statusBar.removeMessage(currentLoadingIdRef.current);
        currentLoadingIdRef.current = null;
      }
    };
  }, [selectedProviderId, accountsLoaded, emailCache]);

  const fetchOAuthAccounts = async () => {
    try {
      const response = await fetch("/api/email/auth/status");
      const data = await response.json();
      
      if (data.success && data.data?.providers) {
        setOauthAccounts(data.data.providers);
        
        // Build providers list from OAuth accounts only
        const oauthProviders = data.data.providers.map((account: OAuthAccount) => ({
          id: account.provider === 'google' ? 'gmail' : 'microsoft',
          name: account.provider === 'google' ? 'Gmail' : 'Outlook',
          icon: account.provider === 'google' ? '📧' : '📬',
          hasOAuth: true,
          email: account.email, // Include email address for sidebar display
          emails: [], // Will be populated when emails are fetched
        }));
        
        // Remove duplicates (in case multiple accounts from same provider)
        const uniqueProviders = Array.from(
          new Map(oauthProviders.map((p: Provider) => [p.id, p])).values()
        ) as Provider[];
        
        setProviders(uniqueProviders);
        setAccountsLoaded(true); // Mark accounts as loaded
      } else {
        setProviders([]);
        setOauthEmails([]);
        setAccountsLoaded(true); // Still mark as loaded even if empty
      }
    } catch (error) {
      console.error('Failed to fetch OAuth accounts:', error);
      setProviders([]);
      setAccountsLoaded(true); // Mark as loaded to prevent hanging
    }
  };

  // Update provider email counts after fetching
  const updateProviderCounts = (emails: OAuthEmail[]) => {
    console.log('[updateProviderCounts] Updating counts for', emails.length, 'emails');
    setProviders(prevProviders => 
      prevProviders.map(provider => {
        // Count emails for this provider by matching providerName
        const providerEmails = emails.filter(email => {
          // Gmail provider matches 'Gmail (OAuth)' or similar
          if (provider.id === 'gmail') return email.providerName?.toLowerCase().includes('gmail');
          // Microsoft/Outlook provider matches 'Outlook (OAuth)' or similar
          if (provider.id === 'microsoft') return email.providerName?.toLowerCase().includes('outlook');
          return false;
        });
        
        console.log(`[updateProviderCounts] Provider ${provider.id}: ${providerEmails.length} emails`);
        
        // Cast the emails to Email[] since we're converting OAuthEmail to Email
        return {
          ...provider,
          emails: providerEmails as Email[],
        };
      })
    );
  };

  const fetchAllOAuthEmails = async (isLoadMore: boolean = false) => {
    if (loadingEmails || loadingMore) return; // Prevent duplicate calls
    
    // Clear any existing loading message before starting new fetch  
    if (!isLoadMore && currentLoadingIdRef.current) {
      statusBar.removeMessage(currentLoadingIdRef.current);
      currentLoadingIdRef.current = null;
    }
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingEmails(true);
      setOauthEmails([]); // Clear existing emails on fresh load
      setHasMore(true);
      setElapsedSeconds(0); // Reset elapsed time
      timeoutHandledRef.current = false; // Reset timeout flag
    }
    setError(null);
    
    const startTime = Date.now();
    let messageStep = 0;
    
    const skip = isLoadMore ? oauthEmails.length : 0;
    const limit = isLoadMore ? emailLoadingConfig.batchSize : emailLoadingConfig.batchSize;
    const timeoutMs = emailLoadingConfig.timeoutSeconds * 1000;
    
    // Show initial message immediately
    const loadingId = statusBar.showLoading(`🔌 Contacting server... (0s)`);
    currentLoadingIdRef.current = loadingId; // Track the loading message ID
    
    // Update message every 1 second with elapsed time
    const messages = [
      '🔌 Contacting server',
      '📬 Authenticating',
      '📨 Reading your emails',
      '📊 Processing email data',
      '⏳ Almost there',
    ];
    
    const updateInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      messageStep = Math.min(messageStep + 1, messages.length - 1);
      statusBar.showLoading(`${messages[messageStep]}... (${elapsed}s)`, loadingId);
      
      console.log(`[⏱️ UnifiedInbox] Elapsed: ${elapsed}s / Timeout: ${emailLoadingConfig.timeoutSeconds}s`);
      
      // Check timeout and show dialog if exceeded
      if (!isLoadMore && elapsed >= emailLoadingConfig.timeoutSeconds && !timeoutHandledRef.current) {
        console.log(`[🚨 UnifiedInbox] TIMEOUT TRIGGERED! Showing timeout dialog...`);
        timeoutHandledRef.current = true;
        setShowTimeoutDialog(true);
      }
    }, 1000);
    
    try {
      // Store request timestamp before fetching
      const requestTimestamp = currentRequestRef.current?.timestamp;
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('[🔄 UnifiedInbox] 📧 FETCHING ALL OAUTH EMAILS');
      console.log(`  Batch Size (limit): ${limit}`);
      console.log(`  Pagination (skip): ${skip}`);
      console.log(`  Timeout: ${emailLoadingConfig.timeoutSeconds}s`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const response = await fetch(`/api/email/oauth/all?limit=${limit}&skip=${skip}`);
      
      // Clear interval
      clearInterval(updateInterval);
      
      // Check if this is still the current request before processing response
      if (currentRequestRef.current?.timestamp !== requestTimestamp) {
        console.log('[UnifiedInbox] Ignoring stale response for ALL emails fetch (newer request initiated)');
        setLoadingEmails(false);
        setLoadingMore(false);
        if (loadingId) {
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null;
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('[📬 UnifiedInbox] 📧 RESPONSE RECEIVED');
      console.log(`  Emails returned: ${data.emails?.length || 0}`);
      console.log(`  Total fetched from all providers: ${data.totalFetched || 0}`);
      console.log(`  Requested batch size: ${limit}`);
      console.log(`  Has more available: ${data.hasMore}`);
      console.log(`  Providers queried: ${data.accounts}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      if (data.debug?.providerMetrics) {
        console.log('[UnifiedInbox] Provider metrics:');
        data.debug.providerMetrics.forEach((metric: any) => {
          console.log(`  - ${metric.provider}: ${metric.count} emails (${metric.duration}ms)`);
        });
        console.log();
      }
      
      console.log('[UnifiedInbox] Sample email from field:', data.emails?.[0]?.from);
      console.log(`[UnifiedInbox] Returning: ${data.emails?.length || 0} of ${data.totalFetched || 0} fetched emails`);

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => {
          // Normalize from field (handle both string and object formats)
          const normalizedFrom = normalizeEmailFrom(email.from);
          
          return {
            id: email.id || `${email.providerName}-${normalizedFrom.email}`,
            from: normalizedFrom,
            subject: email.subject || '(No Subject)',
            preview: email.preview || email.body?.substring(0, 200) || '',
            date: email.date || new Date().toISOString(),
            read: email.read || false,
            providerName: email.providerName || 'Unknown',
          };
        });
        console.log('[UnifiedInbox] Converted emails:', convertedEmails);
        console.log('[UnifiedInbox] Provider names:', convertedEmails.map(e => e.providerName));
        
        // Append or replace emails based on load type
        let finalEmailList: OAuthEmail[];
        let newEmailsCount = convertedEmails.length;
        if (isLoadMore) {
          // Deduplicate: only add emails that don't already exist
          const existingIds = new Set(oauthEmails.map(e => e.id));
          const newEmails = convertedEmails.filter(email => !existingIds.has(email.id));
          newEmailsCount = newEmails.length;
          console.log(`[UnifiedInbox] Deduplication: ${convertedEmails.length} fetched, ${newEmails.length} new, ${convertedEmails.length - newEmails.length} duplicates skipped`);
          finalEmailList = [...oauthEmails, ...newEmails];
          setOauthEmails(finalEmailList);
        } else {
          finalEmailList = convertedEmails;
          setOauthEmails(convertedEmails);
          // TIER 1: Update cache with freshly fetched emails (only on initial load, not on load-more)
          emailCache.onEmailsFetched(convertedEmails);
        }
        
        // Update hasMore flag - if we got fewer NEW emails than requested, might not have more
        setHasMore(data.hasMore === true && newEmailsCount > 0);
        
        // Update provider email counts by provider type
        updateProviderCounts(finalEmailList);
        
        setShowTimeoutDialog(false);
        statusBar.removeMessage(loadingId);
        currentLoadingIdRef.current = null; // Clear the ref
        if (isLoadMore) {
          if (newEmailsCount > 0) {
            statusBar.showSuccess(`Loaded ${newEmailsCount} more email${newEmailsCount !== 1 ? 's' : ''}`);
          } else {
            statusBar.showInfo('No new emails to load');
          }
        } else {
          statusBar.showSuccess(`Loaded ${convertedEmails.length} emails${data.hasMore ? ' (more available)' : ''}`);
        }
      } else {
        if (!isLoadMore) {
          setOauthEmails([]);
        }
        setHasMore(false);
        setShowTimeoutDialog(false);
        statusBar.removeMessage(loadingId);
        currentLoadingIdRef.current = null; // Clear the ref
        statusBar.showInfo('No emails found');
      }
    } catch (error) {
      // Clear interval on error
      clearInterval(updateInterval);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('[UnifiedInbox] Failed to fetch all OAuth emails:', errorMessage);
      setError(errorMessage);
      if (!isLoadMore) {
        setOauthEmails([]);
      }
      setShowTimeoutDialog(false);
      statusBar.removeMessage(loadingId);
      currentLoadingIdRef.current = null; // Clear the ref
      statusBar.showError(errorMessage);
    } finally {
      setLoadingEmails(false);
      setLoadingMore(false);
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = undefined;
      }
    }
  };

  const fetchOAuthEmails = async (provider: string, isLoadMore: boolean = false) => {
    if (loadingEmails || loadingMore) return; // Prevent duplicate calls
    
    // Clear any existing loading message before starting new fetch
    if (!isLoadMore && currentLoadingIdRef.current) {
      statusBar.removeMessage(currentLoadingIdRef.current);
      currentLoadingIdRef.current = null;
    }
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingEmails(true);
      setOauthEmails([]); // Clear existing emails on fresh load
      setHasMore(true);
      setElapsedSeconds(0); // Reset elapsed time
      timeoutHandledRef.current = false; // Reset timeout flag
    }
    setError(null);
    const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
    
    const currentOffset = emailOffsets[provider] || 0;
    const skip = isLoadMore ? currentOffset : 0;
    const limit = isLoadMore ? emailLoadingConfig.batchSize : emailLoadingConfig.batchSize;
    
    // Show initial message immediately
    const loadingId = isLoadMore ? undefined : statusBar.showLoading(`🔌 Connecting to ${providerName}... (0s)`);
    if (loadingId) {
      currentLoadingIdRef.current = loadingId; // Track the loading message ID
    }
    
    const startTime = Date.now();
    let messageStep = 0;
    
    // Update message every 1 second (only for initial load)
    const messages = [
      `🔌 Connecting to ${providerName}`,
      `🔑 Authenticating ${providerName}`,
      `📬 Reading ${providerName} emails`,
      `📊 Loading email data`,
    ];
    
    const updateInterval = !isLoadMore ? setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      messageStep = Math.min(messageStep + 1, messages.length - 1);
      if (loadingId) {
        statusBar.showLoading(`${messages[messageStep]}... (${elapsed}s)`, loadingId);
      }
      
      // Check timeout and show dialog if exceeded
      if (elapsed >= emailLoadingConfig.timeoutSeconds && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        setShowTimeoutDialog(true);
      }
    }, 1000) : undefined;
    
    try {
      // Store request timestamp before fetching
      const requestTimestamp = currentRequestRef.current?.timestamp;
      
      if (updateInterval) clearInterval(updateInterval); // Clear if completes quickly
      
      // Find the email address for this provider
      const account = oauthAccounts.find(acc => 
        (provider === 'gmail' && acc.provider === 'google') ||
        (provider === 'microsoft' && acc.provider === 'microsoft')
      );

      if (!account) {
        console.warn('[UnifiedInbox] No account found for provider:', provider);
        if (!isLoadMore) {
          setOauthEmails([]);
        }
        setLoadingEmails(false);
        if (loadingId) {
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null;
        }
        statusBar.showError(`No ${providerName} account connected`);
        return;
      }

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log(`[🔄 UnifiedInbox] 📧 FETCHING ${provider.toUpperCase()} EMAILS`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Batch Size (limit): ${limit}`);
      console.log(`  Pagination (skip): ${skip}`);
      console.log(`  Timeout: ${emailLoadingConfig.timeoutSeconds}s`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const encodedEmail = encodeURIComponent(account.email);
      const response = await fetch(`/api/email/oauth/provider/${encodedEmail}?limit=${limit}&skip=${skip}`);
      
      // Check if this is still the current request before processing response
      if (currentRequestRef.current?.timestamp !== requestTimestamp) {
        console.log(`[UnifiedInbox] Ignoring stale response for ${provider} emails fetch (newer request initiated)`);
        setLoadingEmails(false);
        setLoadingMore(false);
        if (loadingId) {
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null;
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[UnifiedInbox] ${provider} emails response:`, data);
      console.log('[UnifiedInbox] Sample email from field:', data.emails?.[0]?.from);
      console.log(`[UnifiedInbox] ${provider} emails count: ${data.emails?.length || 0}, hasMore: ${data.hasMore}`);

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => {
          // Normalize from field (handle both string and object formats)
          const normalizedFrom = normalizeEmailFrom(email.from);
          
          return {
            id: email.id || `${provider}-${normalizedFrom.email}`,
            from: normalizedFrom,
            subject: email.subject || '(No Subject)',
            preview: email.preview || email.body?.substring(0, 200) || '',
            date: email.date || new Date().toISOString(),
            read: email.read || false,
            providerName: email.providerName || 'Unknown',
          };
        });
        console.log('[UnifiedInbox] Converted emails:', convertedEmails);
        console.log('[UnifiedInbox] Provider names:', convertedEmails.map(e => e.providerName));
        
        // Append or replace emails based on load type
        let finalEmailList: OAuthEmail[];
        let newEmailsCount = convertedEmails.length;
        if (isLoadMore) {
          // Deduplicate: only add emails that don't already exist
          const existingIds = new Set(oauthEmails.map(e => e.id));
          const newEmails = convertedEmails.filter(email => !existingIds.has(email.id));
          newEmailsCount = newEmails.length;
          console.log(`[UnifiedInbox] Deduplication: ${convertedEmails.length} fetched, ${newEmails.length} new, ${convertedEmails.length - newEmails.length} duplicates skipped`);
          finalEmailList = [...oauthEmails, ...newEmails];
          setOauthEmails(finalEmailList);
          
          // Update offset for this provider
          setEmailOffsets(prev => ({
            ...prev,
            [provider]: (prev[provider] || 0) + newEmailsCount
          }));
        } else {
          finalEmailList = convertedEmails;
          setOauthEmails(convertedEmails);
          // TIER 1: Update cache with freshly fetched emails (only on initial load, not on load-more)
          emailCache.onEmailsFetched(convertedEmails);
          
          // Set initial offset for this provider
          if (convertedEmails.length > 0) {
            setEmailOffsets(prev => ({
              ...prev,
              [provider]: convertedEmails.length
            }));
          }
        }
        
        // Update hasMore flag - if we got fewer emails than requested, might not have more
        setHasMore(data.hasMore === true && convertedEmails.length > 0);
        
        // Update provider email counts for this specific provider
        updateProviderCounts(finalEmailList);
        
        setShowTimeoutDialog(false);
        if (loadingId) {
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null; // Clear the ref
        }
        if (isLoadMore) {
          if (newEmailsCount > 0) {
            statusBar.showSuccess(`Loaded ${newEmailsCount} more email${newEmailsCount !== 1 ? 's' : ''}`);
          } else {
            statusBar.showInfo('No new emails to load');
          }
        } else {
          statusBar.showSuccess(`Loaded ${convertedEmails.length} emails${data.hasMore ? ' (more available)' : ''}`);
        }
      } else {
        if (!isLoadMore) {
          setOauthEmails([]);
        }
        setHasMore(false);
        setShowTimeoutDialog(false);
        if (loadingId) {
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null; // Clear the ref
        }
        statusBar.showInfo(`No emails found in ${providerName}`);
      }
    } catch (error) {
      if (updateInterval) clearInterval(updateInterval); // Clear interval on error
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('[UnifiedInbox] Failed to fetch OAuth emails:', errorMessage);
      setError(errorMessage);
      if (!isLoadMore) {
        setOauthEmails([]);
      }
      setShowTimeoutDialog(false);
      if (loadingId) {
        statusBar.removeMessage(loadingId);
        currentLoadingIdRef.current = null; // Clear the ref
      }
      statusBar.showError(errorMessage);
    } finally {
      setLoadingEmails(false);
      setLoadingMore(false);
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = undefined;
      }
    }
  };

  // Load more emails (wrapper for clarity)
  const loadMoreEmails = () => {
    if (selectedProviderId === "all") {
      fetchAllOAuthEmails(true);
    } else {
      fetchOAuthEmails(selectedProviderId, true);
    }
  };

  /**
   * Handle email actions (archive, delete, mark as read)
   * Updates local state to reflect the action
   */
  const handleEmailAction = (action: "archive" | "delete" | "read", emailId: string) => {
    if (action === "archive" || action === "delete") {
      // Remove the email from the list after archive/delete
      setOauthEmails(prev => prev.filter(email => email.id !== emailId));
      // Clear selection
      setSelectedEmailId(undefined);
    } else if (action === "read") {
      // Update read status
      setOauthEmails(prev =>
        prev.map(email =>
          email.id === emailId ? { ...email, read: true } : email
        )
      );
    }
  };

  // Convert OAuth emails to UI format
  const emails: Email[] = oauthEmails.map(email => ({
    id: email.id,
    from: email.from,
    subject: email.subject,
    preview: email.preview,
    date: new Date(email.date),
    read: email.read,
    providerName: email.providerName?.includes('Gmail') ? 'Gmail' : 'Outlook',
  }));

  console.log('[UnifiedInbox] Conversion to UI emails:', {
    oauthEmailsCount: oauthEmails.length,
    convertedEmailsCount: emails.length,
    providerNames: emails.map(e => e.providerName),
  });

  // Filter emails based on selected provider
  const filteredEmails = selectedProviderId === "all" 
    ? emails 
    : emails.filter(email => {
        // Match provider ID to email providerName
        if (selectedProviderId === 'gmail') {
          const match = email.providerName?.toLowerCase().includes('gmail');
          console.log(`[UnifiedInbox] Gmail filter check - email: ${email.subject}, provider: ${email.providerName}, match: ${match}`);
          return match;
        }
        if (selectedProviderId === 'microsoft') {
          const match = email.providerName?.toLowerCase().includes('outlook');
          console.log(`[UnifiedInbox] Outlook filter check - email: ${email.subject}, provider: ${email.providerName}, match: ${match}`);
          return match;
        }
        return false;
      });

  // Log filtering for debugging
  console.log(`[UnifiedInbox] After filter - selectedProvider: ${selectedProviderId}, rawCount: ${emails.length}, filteredCount: ${filteredEmails.length}`);

  // Get font size classes
  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'small':
        return 'text-sm [&_*]:text-sm [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-base [&_p]:text-sm [&_span]:text-sm';
      case 'large':
        return 'text-lg [&_*]:text-lg [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:text-lg [&_span]:text-lg';
      case 'medium':
      default:
        return 'text-base [&_*]:text-base [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_p]:text-base [&_span]:text-base';
    }
  };

  // Sort emails by date (newest first)
  const sortedEmails = [...filteredEmails].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // For Load More pattern, we show all loaded emails without pagination
  const displayedEmails = sortedEmails;

  const unreadCount = sortedEmails.filter((email) => !email.read).length;
  
  // Get selected provider details for display
  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const selectedProviderName = selectedProviderId === "all" 
    ? "All Emails"
    : selectedProvider?.name || "Unified Inbox";
  const selectedProviderEmail = selectedProvider?.email;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <UnifiedSidebar
        providers={providers}
        selectedProviderId={selectedProviderId}
        onProviderSelect={setSelectedProviderId}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden ${getFontSizeClasses()}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedProviderName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProviderEmail && (
                <span className="font-medium text-primary mr-2">
                  {selectedProviderEmail}
                </span>
              )}
              {selectedProviderEmail && "• "}
              Showing {sortedEmails.length} email{sortedEmails.length !== 1 ? "s" : ""} (
              {unreadCount} unread)
              {hasMore && " • More available"}
              {(loadingEmails || loadingMore) && " • Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(loadingEmails || loadingMore) && (
              <Loader className="w-4 h-4 animate-spin text-primary" />
            )}
            {/* TIER 1: Refresh button to clear cache and fetch fresh emails */}
            <Button
              variant="outline"
              size="icon"
              onClick={emailCache.onRefreshClick}
              title="Clear cache and fetch fresh emails"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            {/* Font Size Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Font size">
                  <Type className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setFontSize('small')}
                  className={fontSize === 'small' ? 'bg-accent' : ''}
                >
                  <span className="text-sm">Small</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFontSize('medium')}
                  className={fontSize === 'medium' ? 'bg-accent' : ''}
                >
                  <span className="text-base">Medium</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFontSize('large')}
                  className={fontSize === 'large' ? 'bg-accent' : ''}
                >
                  <span className="text-lg">Large</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              asChild
              variant="outline"
              size="sm"
              title="Back to dashboard"
            >
              <Link to="/dashboard">
                <LayoutGrid className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              title="Settings"
            >
              <Link to="/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <ThemeDropdown />
            <SecurityButton />
          </div>
        </div>

        {/* Email List & Detail Split Pane */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {error && (
            <ErrorAlert
              message={error}
              details="Failed to load emails from your connected accounts. Check your connection and try again."
              onDismiss={() => setError(null)}
              onRetry={() => {
                if (selectedProviderId === "all") {
                  fetchAllOAuthEmails(false);
                } else {
                  fetchOAuthEmails(selectedProviderId);
                }
              }}
            />
          )}
          {providers.length === 0 ? (
            <div className="flex items-center justify-center h-full flex-col w-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No email accounts connected</p>
                <Button asChild>
                  <Link to="/settings">Connect an email account</Link>
                </Button>
              </div>
            </div>
          ) : loadingEmails && sortedEmails.length === 0 ? (
            <div className="flex items-center justify-center flex-1 w-full">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Loading emails...</p>
              </div>
            </div>
          ) : sortedEmails.length === 0 ? (
            <div className="flex items-center justify-center flex-1 w-full">
              <div className="text-center">
                <p className="text-muted-foreground">No emails to display</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Show email detail when selected */}
              {selectedEmailId && (
                <div className="lg:hidden absolute inset-0 bg-white z-10">
                  {(() => {
                    const selectedEmail = sortedEmails.find((e) => e.id === selectedEmailId) as Email | undefined;
                    const provider = selectedProviderId === "all" ? getProviderFromEmail(selectedEmail) : (selectedProviderId === "gmail" ? "gmail" : "outlook");
                    
                    // Find the OAuth account for this provider
                    const accountProvider = provider === 'gmail' ? 'google' : 'microsoft';
                    const correctAccount = oauthAccounts.find(acc => acc.provider === accountProvider);
                    const correctUserEmail = correctAccount?.email;
                    
                    return (
                      <EmailDetail
                        email={selectedEmail}
                        onClose={() => setSelectedEmailId(undefined)}
                        userEmail={correctUserEmail}
                        provider={provider}
                        onEmailAction={handleEmailAction}
                      />
                    );
                  })()}
                </div>
              )}

              {/* Left Pane: Email List */}
              <div className={`w-full lg:w-2/5 flex flex-col overflow-hidden ${selectedEmailId && "hidden lg:flex"}`}>
                <div className="flex-1 overflow-hidden">
                  <EmailList
                    emails={displayedEmails}
                    selectedEmailId={selectedEmailId}
                    onEmailSelect={(email) => setSelectedEmailId(email.id)}
                  />
                </div>

                {/* Load More Button */}
                {hasMore && !loadingEmails && (
                  <div className="border-t border-border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 px-6 py-4">
                    <Button
                      onClick={loadMoreEmails}
                      disabled={loadingMore}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {loadingMore ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin mr-2" />
                          Loading more emails...
                        </>
                      ) : (
                        <>
                          📨 Load More ({emailLoadingConfig.batchSize} more)
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      {sortedEmails.length} emails loaded so far
                    </p>
                  </div>
                )}
              </div>

              {/* Right Pane: Email Detail (Desktop only) */}
              <div className="hidden lg:flex flex-col flex-1 overflow-hidden bg-gray-50">
                {(() => {
                  const selectedEmail = sortedEmails.find((e) => e.id === selectedEmailId) as Email | undefined;
                  const provider = selectedProviderId === "all" ? getProviderFromEmail(selectedEmail) : (selectedProviderId === "gmail" ? "gmail" : "outlook");
                  
                  // Find the OAuth account for this provider
                  const accountProvider = provider === 'gmail' ? 'google' : 'microsoft';
                  const correctAccount = oauthAccounts.find(acc => acc.provider === accountProvider);
                  const correctUserEmail = correctAccount?.email;
                  
                  return (
                    <EmailDetail
                      email={selectedEmail}
                      userEmail={correctUserEmail}
                      provider={provider}
                      onEmailAction={handleEmailAction}
                    />
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Status Bar */}
      <StatusBar
        messages={statusBar.messages}
        onDismiss={statusBar.removeMessage}
      />
      
      {/* Email Loading Timeout Dialog */}
      <EmailLoadingTimeoutDialog
        open={showTimeoutDialog}
        elapsedSeconds={elapsedSeconds}
        timeoutSeconds={emailLoadingConfig.timeoutSeconds}
        onContinue={() => {
          setShowTimeoutDialog(false);
          timeoutHandledRef.current = false;
        }}
        onCancel={() => {
          setShowTimeoutDialog(false);
          setLoadingEmails(false);
          setLoadingMore(false);
          if (currentLoadingIdRef.current) {
            statusBar.removeMessage(currentLoadingIdRef.current);
            currentLoadingIdRef.current = null;
          }
          statusBar.showInfo('Email loading cancelled');
        }}
      />
    </div>
  );
}
