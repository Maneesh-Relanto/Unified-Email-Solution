/**
 * useEmailCache Hook - React integration for email caching
 * 
 * Provides:
 * - Automatic cache checking on mount
 * - Cache update after successful fetch
 * - Manual refresh trigger
 * - Cache status info
 */

import { useEffect, useState, useCallback } from 'react';
import { getCachedEmails, setCachedEmails, clearProviderCache, getCacheStats, getProviderTTL } from './use-email-cache';
import type { OAuthEmail } from '@/pages/UnifiedInbox';

export interface CacheStatus {
  cached: boolean;
  valid: boolean;
  ageMs: number | null;
  remainingMs: number | null;
}

export interface UseEmailCacheReturn {
  cachedEmails: OAuthEmail[] | null;
  cacheStatus: CacheStatus;
  shouldFetchFresh: boolean;
  onEmailsFetched: (emails: OAuthEmail[]) => void;
  onRefreshClick: () => void;
}

/**
 * Hook to manage email caching
 * 
 * Usage:
 * const { cachedEmails, shouldFetchFresh, onEmailsFetched, onRefreshClick } = useEmailCache('all');
 * 
 * if (cachedEmails && !shouldFetchFresh) {
 *   // Show cached emails immediately
 *   setOauthEmails(cachedEmails);
 * } else if (shouldFetchFresh) {
 *   // Fetch fresh data
 *   fetchEmailsFromAPI();
 * }
 */
export const useEmailCache = (provider: string) => {
  const [cachedEmails, setCachedEmails] = useState<OAuthEmail[] | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    cached: false,
    valid: false,
    ageMs: null,
    remainingMs: null,
  });
  
  // Check cache on mount or provider change
  useEffect(() => {
    console.log(`[useEmailCache] Checking cache for provider: ${provider}`);
    
    const cached = getCachedEmails<OAuthEmail[]>(provider);
    const providerTTL = getProviderTTL(provider);
    
    if (cached && Array.isArray(cached)) {
      console.log(`[useEmailCache] Found cached emails for ${provider} (${cached.length} emails)`);
      setCachedEmails(cached);
      
      setCacheStatus({
        cached: true,
        valid: true,
        ageMs: 0, // Could calculate from cache entry if needed
        remainingMs: providerTTL,
      });
    } else {
      console.log(`[useEmailCache] No valid cache for ${provider}`);
      setCachedEmails(null);
      setCacheStatus({
        cached: false,
        valid: false,
        ageMs: null,
        remainingMs: null,
      });
    }
  }, [provider]);
  
  // Callback when emails are successfully fetched from API
  // Updates cache for future use
  const onEmailsFetched = useCallback((emails: OAuthEmail[]) => {
    console.log(`[useEmailCache] Caching ${emails.length} emails for provider: ${provider}`);
    setCachedEmails(emails);
    
    // Store in sessionStorage with provider-specific TTL
    const providerTTL = getProviderTTL(provider);
    import('./use-email-cache').then(module => {
      module.setCachedEmails(provider, emails, providerTTL);
    });
  }, [provider]);
  
  // Callback for manual "Refresh" button
  const onRefreshClick = useCallback(() => {
    console.log(`[useEmailCache] User clicked refresh for provider: ${provider}`);
    
    // Clear cache
    clearProviderCache(provider);
    
    // Clear state
    setCachedEmails(null);
    setCacheStatus({
      cached: false,
      valid: false,
      ageMs: null,
      remainingMs: null,
    });
    
    console.log(`[useEmailCache] Cache cleared for ${provider}, will fetch fresh on next load`);
  }, [provider]);
  
  return {
    cachedEmails,
    cacheStatus,
    shouldFetchFresh: !cachedEmails || !cacheStatus.valid,
    onEmailsFetched,
    onRefreshClick,
  };
};

/**
 * Debug hook to monitor cache status
 * Shows what's currently cached
 */
export const useCacheDebug = () => {
  const [stats, setStats] = useState(getCacheStats());
  
  // Refresh stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return stats;
};
