/**
 * useEmailCache Hook - React integration for email caching
 * 
 * Provides:
 * - Automatic cache checking on mount
 * - Cache update after successful fetch
 * - Manual refresh trigger
 * - Cache status info
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCachedEmails, setCachedEmails, clearProviderCache, getCacheStats, getProviderTTL, getCacheMetadata } from './use-email-cache';
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
  // Refresh counter to force re-fetch when user clicks refresh
  // Also used to invalidate memos when cache is updated
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // CRITICAL: Synchronously derive cache from sessionStorage whenever provider changes
  // useMemo ensures we always read the correct provider's cache, never stale data
  const cachedEmails = useMemo(() => {
    console.log(`[useEmailCache] SYNC: Loading cache for provider: ${provider} (refresh: ${refreshCounter})`);
    const cached = getCachedEmails<OAuthEmail[]>(provider);
    if (cached && Array.isArray(cached)) {
      console.log(`[useEmailCache] SYNC: Found ${cached.length} cached emails for ${provider}`);
      return cached;
    }
    console.log(`[useEmailCache] SYNC: No cache found for ${provider}`);
    return null;
  }, [provider, refreshCounter]); // Re-compute when provider OR refreshCounter changes
  
  // Synchronously compute cache status from metadata
  const cacheStatus = useMemo<CacheStatus>(() => {
    const metadata = getCacheMetadata(provider);
    
    if (cachedEmails && Array.isArray(cachedEmails) && metadata) {
      return {
        cached: true,
        valid: true,
        ageMs: metadata.ageMs,
        remainingMs: metadata.remainingMs,
      };
    }
    return {
      cached: false,
      valid: false,
      ageMs: null,
      remainingMs: null,
    };
  }, [provider, cachedEmails]);
  
  // Callback when emails are successfully fetched from API
  // Updates cache for future use
  const onEmailsFetched = useCallback((emails: OAuthEmail[]) => {
    console.log(`[useEmailCache] Caching ${emails.length} emails for provider: ${provider}`);
    
    // Store in sessionStorage with provider-specific TTL
    const providerTTL = getProviderTTL(provider);
    setCachedEmails(provider, emails, providerTTL);
    
    // Increment refreshCounter to invalidate useMemo and re-read from sessionStorage
    setRefreshCounter(prev => prev + 1);
  }, [provider]);
  
  // Callback for manual "Refresh" button
  const onRefreshClick = useCallback(() => {
    console.log(`[useEmailCache] User clicked refresh for provider: ${provider}`);
    
    // Clear cache from sessionStorage
    clearProviderCache(provider);
    
    // Increment counter to invalidate useMemo and force re-read (which will find no cache)
    setRefreshCounter(prev => prev + 1);
    
    console.log(`[useEmailCache] Cache cleared for ${provider}, triggering refresh`);
  }, [provider]);
  
  return {
    cachedEmails,
    cacheStatus,
    shouldFetchFresh: !cachedEmails || !cacheStatus.valid,
    refreshCounter, // Used to trigger useEffect when refresh is clicked
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
