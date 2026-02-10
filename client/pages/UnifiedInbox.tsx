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
import { LayoutGrid, Settings, Loader, Type, AlertCircle, X, RefreshCw } from "lucide-react";
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
  const [selectedProviderId, setSelectedProviderId] = useState<string>("dashboard");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [oauthEmails, setOauthEmails] = useState<OAuthEmail[]>([]);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false); // Track if error is authentication related
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [emailOffsets, setEmailOffsets] = useState<Record<string, number>>({}); // Track offset per provider
  const [providerEmailsCache, setProviderEmailsCache] = useState<Record<string, OAuthEmail[]>>({}); // Cache emails per provider to preserve counts
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
  
  // Track last error time to prevent infinite retry loops
  const lastErrorTimeRef = useRef<number>(0);
  const ERROR_COOLDOWN_MS = 5000; // Don't retry for 5 seconds after an error
  
  // Track if we just wrote to cache to prevent showing READ notification immediately after WRITE
  const justWroteToCacheRef = useRef<boolean>(false);

  // Initialize providers from OAuth accounts on mount
  useEffect(() => {
    fetchOAuthAccounts();
  }, []);
  
  // Restore sidebar counts from cache on component mount (e.g., when navigating back from settings)
  useEffect(() => {
    console.log('[UnifiedInbox] Restoring counts from cache on mount');
    
    // Import cache utils and restore cached emails for all providers
    import('../hooks/use-email-cache').then(module => {
      const gmailCache = module.getCachedEmails('gmail');
      const microsoftCache = module.getCachedEmails('microsoft');
      
      const restoredCache: Record<string, OAuthEmail[]> = {};
      
      if (gmailCache && Array.isArray(gmailCache)) {
        restoredCache['gmail'] = gmailCache;
        console.log(`[UnifiedInbox] Restored ${gmailCache.length} Gmail emails from cache`);
      }
      
      if (microsoftCache && Array.isArray(microsoftCache)) {
        restoredCache['microsoft'] = microsoftCache;
        console.log(`[UnifiedInbox] Restored ${microsoftCache.length} Outlook emails from cache`);
      }
      
      if (Object.keys(restoredCache).length > 0) {
        setProviderEmailsCache(restoredCache);
        updateProviderCounts(restoredCache);
        console.log('[UnifiedInbox] Sidebar counts restored from cache');
      }
    });
  }, []); // Run once on mount

  // Set default provider to first account when accounts are loaded
  useEffect(() => {
    if (accountsLoaded && providers.length > 0 && !selectedProviderId) {
      const firstProviderId = providers[0].id;
      console.log('[UnifiedInbox] Setting default provider to first account:', firstProviderId);
      setSelectedProviderId(firstProviderId);
    }
  }, [accountsLoaded, providers, selectedProviderId]);

  // Fetch emails when provider changes (only after accounts are loaded)
  useEffect(() => {
    if (!accountsLoaded) return; // Don't fetch until accounts are loaded
    
    // Skip fetching for dashboard view
    if (selectedProviderId === "dashboard") {
      console.log('[UnifiedInbox] Dashboard selected - no email fetching');
      setOauthEmails([]); // Clear emails when showing dashboard
      setSelectedEmailId(undefined); // Clear selected email
      return;
    }
    
    // CRITICAL: Clear existing emails AND selected email immediately when provider changes
    // This prevents showing Gmail emails when switching to Outlook
    // and prevents trying to fetch Outlook emails with Gmail provider
    console.log('[UnifiedInbox] Provider changed to:', selectedProviderId);
    console.log('[UnifiedInbox] Clearing existing emails and selection before switch');
    setOauthEmails([]);
    setSelectedEmailId(undefined); // Clear email selection to prevent cross-provider fetch errors
    
    // Reset the cache write flag when provider changes
    justWroteToCacheRef.current = false;
    
    // Prevent infinite retry loops - don't fetch if we just had an error
    const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
    if (timeSinceLastError < ERROR_COOLDOWN_MS) {
      console.log(`[UnifiedInbox] ⏸️ Skipping fetch - in error cooldown (${Math.floor((ERROR_COOLDOWN_MS - timeSinceLastError) / 1000)}s remaining)`);
      return;
    }
    
    // Mark the current request so we can detect out-of-order responses
    const requestTimestamp = Date.now();
    currentRequestRef.current = { providerId: selectedProviderId, timestamp: requestTimestamp };
    console.log('[UnifiedInbox] New request marked:', { providerId: selectedProviderId, timestamp: requestTimestamp });
    
    // Clear any existing loading message when switching providers
    if (currentLoadingIdRef.current) {
      statusBar.removeMessage(currentLoadingIdRef.current);
      currentLoadingIdRef.current = null;
    }
    
    console.log('[UnifiedInbox] 🔄 PROVIDER SWITCHED TO:', selectedProviderId, {
      cacheAvailable: !!emailCache.cachedEmails,
      cacheCount: emailCache.cachedEmails?.length || 0,
      currentEmailCount: oauthEmails.length
    });
    
    // Reset offsets when switching providers
    console.log('[UnifiedInbox] Resetting email offsets');
    setEmailOffsets({});
    
    // TIER 1: ALWAYS check cache first - load from cache if available (even if expired)
    // User can manually refresh using the Refresh button if they want latest data
    console.log('[UnifiedInbox] Cache check for provider:', selectedProviderId, '| Has cache:', !!emailCache.cachedEmails, '| Count:', emailCache.cachedEmails?.length || 0);
    
    if (emailCache.cachedEmails && emailCache.cachedEmails.length > 0) {
      console.log('[UnifiedInbox] 📦 Using cached emails for provider:', selectedProviderId);
      console.log('[UnifiedInbox] Cache info:', emailCache.cacheStatus);
      
      // Defensive check: Ensure cached emails match current provider
      const firstEmail = emailCache.cachedEmails[0];
      const cachedProvider = getProviderFromEmail(firstEmail);
      const expectedProvider = selectedProviderId === 'microsoft' ? 'outlook' : selectedProviderId;
      
      if (cachedProvider !== expectedProvider) {
        console.warn('[UnifiedInbox] ⚠️ Cache mismatch! Cached provider:', cachedProvider, 'Expected:', expectedProvider);
        console.warn('[UnifiedInbox] Clearing cache and fetching fresh...');
        emailCache.onRefreshClick();
        // Continue to fetch fresh below
      } else {
        setOauthEmails(emailCache.cachedEmails);
        
        // Update providerEmailsCache when loading from sessionStorage cache
        const cacheKey = selectedProviderId;
        console.log('[UnifiedInbox] Updating providerEmailsCache with key:', cacheKey, '| Email count:', emailCache.cachedEmails.length);
        
        const updatedCache = {
          ...providerEmailsCache,
          [cacheKey]: emailCache.cachedEmails
        };
        
        setProviderEmailsCache(updatedCache);
        
        // Update counts with the new cache data (pass it directly to avoid async state issue)
        console.log('[UnifiedInbox] Calling updateProviderCounts with fresh cache data');
        updateProviderCounts({ [cacheKey]: emailCache.cachedEmails });
        
        // Only show cache status if we didn't just write to cache (avoid redundant notifications)
        if (!justWroteToCacheRef.current) {
          const remaining = emailCache.cacheStatus.remainingMs || 0;
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          const count = emailCache.cachedEmails.length;
          const isExpired = remaining <= 0;
          
          if (isExpired) {
            statusBar.showInfo(`📦 READ FROM CACHE: ${count} email${count !== 1 ? 's' : ''} (expired - click Refresh for latest)`);
          } else {
            statusBar.showSuccess(`📦 READ FROM CACHE: ${count} email${count !== 1 ? 's' : ''} (expires in ${minutes}m ${seconds}s)`);
          }
        } else {
          console.log('[UnifiedInbox] Skipping READ notification - just wrote to cache');
          justWroteToCacheRef.current = false; // Reset flag after skipping
        }
        return; // Skip API fetch - user can click Refresh button to get latest
      }
    }
    
    // No cache found - fetch from server
    console.log(`[UnifiedInbox] No cache found, fetching ${selectedProviderId} emails from server`);
    fetchOAuthEmails(selectedProviderId);
    
    // Cleanup function to clear loading message if component unmounts or provider changes
    return () => {
      if (currentLoadingIdRef.current) {
        statusBar.removeMessage(currentLoadingIdRef.current);
        currentLoadingIdRef.current = null;
      }
    };
    // Note: emailCache.cachedEmails is NOT in dependencies to avoid double-run after caching
    // refreshCounter changes when user clicks Refresh button, forcing re-fetch
  }, [selectedProviderId, accountsLoaded, emailCache.refreshCounter]);

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
  // Uses the providerEmailsCache to get accurate counts across all providers
  const updateProviderCounts = (additionalCache?: Record<string, OAuthEmail[]>) => {
    // Merge current cache with any additional cache passed in
    const mergedCache = additionalCache ? { ...providerEmailsCache, ...additionalCache } : providerEmailsCache;
    
    // Combine all cached emails from all providers
    const allCachedEmails = Object.values(mergedCache).flat();
    console.log('[updateProviderCounts] Updating counts from cache:', {
      cacheKeys: Object.keys(mergedCache),
      totalEmails: allCachedEmails.length,
      perProvider: Object.entries(mergedCache).map(([key, emails]) => ({ key, count: emails.length }))
    });
    
    setProviders(prevProviders => 
      prevProviders.map(provider => {
        // Count emails for this provider by matching providerName
        const providerEmails = allCachedEmails.filter(email => {
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
    setIsAuthError(false);
    
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
      if (data.errors) {
        console.log(`  ⚠️ Errors: ${data.errors.length}`);
      }
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      if (data.debug?.providerMetrics) {
        console.log('[UnifiedInbox] Provider metrics:');
        data.debug.providerMetrics.forEach((metric: any) => {
          console.log(`  - ${metric.provider}: ${metric.count} emails (${metric.duration}ms)`);
        });
        console.log();
      }
      
      // Check for authentication errors even if response is "successful"
      if (data.errors && data.errors.length > 0) {
        const authErrors = data.errors.filter((err: string) => 
          err.toLowerCase().includes('authentication') || 
          err.toLowerCase().includes('unauthorized') ||
          err.toLowerCase().includes('token') ||
          err.toLowerCase().includes('expired')
        );
        
        if (authErrors.length > 0) {
          console.error('[UnifiedInbox] ⚠️ Authentication errors detected:', authErrors);
          
          // Extract email addresses from error messages
          const failedAccounts = authErrors.map((err: string) => {
            const match = err.match(/^(.+?):/);
            return match ? match[1] : 'Unknown account';
          });
          
          clearInterval(updateInterval);
          setLoadingEmails(false);
          setLoadingMore(false);
          setShowTimeoutDialog(false);
          statusBar.removeMessage(loadingId);
          currentLoadingIdRef.current = null;
          
          const errorMsg = authErrors.length === 1 
            ? `Authentication failed for ${failedAccounts[0]}. Your login session has expired.`
            : `Authentication failed for ${authErrors.length} account${authErrors.length > 1 ? 's' : ''}. Your login sessions have expired.`;
          
          setError(errorMsg);
          setIsAuthError(true);
          statusBar.showError('⚠️ Authentication Required - Please re-login to your email accounts');
          return;
        }
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
        console.log('[UnifiedInbox] 🔍 DEBUG - Email distribution:', {
          totalEmails: convertedEmails.length,
          outlookEmails: convertedEmails.filter(e => e.providerName?.toLowerCase().includes('outlook')).length,
          gmailEmails: convertedEmails.filter(e => e.providerName?.toLowerCase().includes('gmail')).length,
          uniqueProviderNames: [...new Set(convertedEmails.map(e => e.providerName))],
          firstEmailProvider: convertedEmails[0]?.providerName
        });
        
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
          
          // DON'T cache 'all' emails under 'all' key - split and cache individually instead
          // This is handled below after splitting
        }
        
        // Update hasMore flag - if we got fewer NEW emails than requested, might not have more
        setHasMore(data.hasMore === true && newEmailsCount > 0);
        
        // CRITICAL: For 'all' provider, split emails by provider and cache individually
        // This prevents double-counting and ensures cache hits when switching to individual providers
        const gmailEmails = finalEmailList.filter(e => e.providerName?.toLowerCase().includes('gmail'));
        const outlookEmails = finalEmailList.filter(e => e.providerName?.toLowerCase().includes('outlook'));
        
        console.log('[UnifiedInbox] 🔍 DEBUG - Split for all provider:', {
          totalEmails: finalEmailList.length,
          gmailCount: gmailEmails.length,
          outlookCount: outlookEmails.length,
          gmailProviderNames: gmailEmails.slice(0, 3).map(e => e.providerName),
          outlookProviderNames: outlookEmails.slice(0, 3).map(e => e.providerName)
        });
        
        // Cache split emails under individual provider keys (NOT under 'all' key)
        // This ensures cache hits when user switches to Gmail or Outlook
        if (!isLoadMore && gmailEmails.length > 0) {
          import('../hooks/use-email-cache').then(module => {
            const providerTTL = module.getProviderTTL('gmail');
            module.setCachedEmails('gmail', gmailEmails, providerTTL);
            console.log(`[UnifiedInbox] 💾 Cached ${gmailEmails.length} Gmail emails to emailify_cache_gmail`);
          });
        }
        
        if (!isLoadMore && outlookEmails.length > 0) {
          import('../hooks/use-email-cache').then(module => {
            const providerTTL = module.getProviderTTL('microsoft');
            module.setCachedEmails('microsoft', outlookEmails, providerTTL);
            console.log(`[UnifiedInbox] 💾 Cached ${outlookEmails.length} Outlook emails to emailify_cache_microsoft`);
          });
        }
        
        const updatedCache = {
          ...providerEmailsCache,
          'gmail': gmailEmails,
          'microsoft': outlookEmails
          // Note: We DO NOT store under 'all' key to prevent double-counting
        };
        
        setProviderEmailsCache(updatedCache);
        
        // Update provider email counts using the fresh cache (pass directly to avoid async state issue)
        updateProviderCounts({ 'gmail': gmailEmails, 'microsoft': outlookEmails });
        
        // Show cache write confirmation
        if (!isLoadMore) {
          const ttlMinutes = Math.floor(60 * 60 * 1000 / 60000); // 60 minutes default TTL
          statusBar.showSuccess(`💾 WRITTEN TO CACHE: Gmail (${gmailEmails.length}), Outlook (${outlookEmails.length}) | TTL: ${ttlMinutes}m`);
          justWroteToCacheRef.current = true; // Mark that we just wrote to prevent immediate READ notification
        }
        
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
      
      // Record error time to prevent infinite retries
      lastErrorTimeRef.current = Date.now();
      
      let errorMessage = 'Failed to fetch emails';
      let isConnectionError = false;
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        isConnectionError = true;
        errorMessage = 'Cannot connect to server. Please check if the server is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('[UnifiedInbox] Failed to fetch all OAuth emails:', errorMessage);
      setError(errorMessage);
      setIsAuthError(false); // General error, not authentication related
      if (!isLoadMore) {
        setOauthEmails([]);
      }
      setShowTimeoutDialog(false);
      statusBar.removeMessage(loadingId);
      currentLoadingIdRef.current = null; // Clear the ref
      
      if (isConnectionError) {
        statusBar.showError('⚠️ Server not available - check if dev server is running');
      } else {
        statusBar.showError(errorMessage);
      }
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
    setIsAuthError(false);
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
          
          // Show cache write confirmation to user
          // remainingMs is set to the full TTL after a fresh write
          const ttlMinutes = Math.floor((emailCache.cacheStatus.remainingMs || 60 * 60 * 1000) / 60000);
          statusBar.showSuccess(`💾 WRITTEN TO CACHE: ${convertedEmails.length} email${convertedEmails.length !== 1 ? 's' : ''} (TTL: ${ttlMinutes}m)`);
          justWroteToCacheRef.current = true; // Mark that we just wrote to prevent immediate READ notification
          
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
        
        // Update cache for this specific provider to preserve counts
        const updatedCache = {
          ...providerEmailsCache,
          [provider]: finalEmailList
        };
        
        setProviderEmailsCache(updatedCache);
        
        // Update provider email counts using the fresh cache (pass directly to avoid async state issue)
        updateProviderCounts({ [provider]: finalEmailList });
        
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
      
      // Record error time to prevent infinite retries
      lastErrorTimeRef.current = Date.now();
      
      let errorMessage = 'Failed to fetch emails';
      let isConnectionError = false;
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        isConnectionError = true;
        errorMessage = 'Cannot connect to server. Please check if the server is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('[UnifiedInbox] Failed to fetch OAuth emails:', errorMessage);
      setError(errorMessage);
      setIsAuthError(false); // General error, not authentication related
      if (!isLoadMore) {
        setOauthEmails([]);
      }
      setShowTimeoutDialog(false);
      if (loadingId) {
        statusBar.removeMessage(loadingId);
        currentLoadingIdRef.current = null; // Clear the ref
      }
      
      if (isConnectionError) {
        statusBar.showError('⚠️ Server not available - check if dev server is running');
      } else {
        statusBar.showError(errorMessage);
      }
    } finally {
      setLoadingEmails(false);
      setLoadingMore(false);
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = undefined;
      }
    }
  };

  // Load more emails for the currently selected provider
  const loadMoreEmails = () => {
    if (selectedProviderId !== "dashboard") {
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

  // Filter emails based on selected provider (no filtering needed, emails already filtered)
  const filteredEmails = emails;

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
  const selectedProviderName = selectedProvider?.name || "Unified Inbox";
  const selectedProviderEmail = selectedProviderId === "dashboard" ? undefined : selectedProvider?.email;

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
              onClick={emailCache.onRefreshClick}
              variant="outline"
              size="sm"
              title="Refresh emails from server (bypass cache)"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              title="Back to home"
            >
              <Link to="/">
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
            <div className="mx-4 my-4">
              {isAuthError ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4" role="alert">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-200">Authentication Required</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{error}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                        Your email provider requires you to log in again. This happens when:
                      </p>
                      <ul className="text-sm text-amber-700 dark:text-amber-400 mt-1 ml-4 list-disc space-y-1">
                        <li>Your login session has expired (usually after 7-60 days)</li>
                        <li>You changed your password</li>
                        <li>Your account security settings were updated</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => { setError(null); setIsAuthError(false); }}
                      className="text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-300 flex-shrink-0"
                      aria-label="Dismiss error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                      <Link to="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Go to Settings to Re-authenticate
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setError(null); setIsAuthError(false); }}
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : (
                <ErrorAlert
                  message={error}
                  details="Failed to load emails from your connected accounts. Check your connection and try again."
                  onDismiss={() => { setError(null); setIsAuthError(false); }}
                  onRetry={() => {
                    if (selectedProviderId !== "dashboard") {
                      fetchOAuthEmails(selectedProviderId);
                    }
                  }}
                />
              )}
            </div>
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
          ) : selectedProviderId === "dashboard" ? (
            <div className="flex items-center justify-center h-full w-full p-8">
              <div className="max-w-4xl w-full space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">Welcome to Your Unified Inbox</h2>
                  <p className="text-muted-foreground">Select an email account from the sidebar to view messages</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProviderId(provider.id)}
                      className="p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-4xl">{provider.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold">{provider.name}</h3>
                          {provider.email && (
                            <p className="text-sm text-muted-foreground">{provider.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {provider.emails?.length || 0} emails loaded
                        </span>
                        <span className="text-primary font-medium">View Inbox →</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 p-6 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Quick Stats</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {providers.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Connected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {Object.values(providerEmailsCache).flat().length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Emails</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">60 min</div>
                      <div className="text-sm text-muted-foreground">Cache TTL</div>
                    </div>
                  </div>
                </div>
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
                    const provider = getProviderFromEmail(selectedEmail);
                    
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
                    onEmailSelect={(email) => {
                      // Validate email belongs to current provider before selecting
                      const emailProvider = getProviderFromEmail(email);
                      const currentProvider = selectedProviderId === 'microsoft' ? 'outlook' : selectedProviderId;
                      
                      if (emailProvider !== currentProvider && selectedProviderId !== 'dashboard') {
                        console.warn('[UnifiedInbox] Prevented cross-provider email selection');
                        console.warn('[UnifiedInbox] Email provider:', emailProvider, 'Current provider:', currentProvider);
                        return;
                      }
                      
                      setSelectedEmailId(email.id);
                    }}
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
