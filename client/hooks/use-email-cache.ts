/**
 * Email Cache Hook - Tier 1: Client-side cache with configurable TTL per provider
 * 
 * Strategy:
 * - Store email data in sessionStorage (lives during session, cleared on tab close)
 * - Separate cache entries per provider (gmail, outlook, all)
 * - Automatic expiry after provider-specific TTL
 * - Manual cache clear option (for "Refresh" button)
 * - User-configurable TTL via settings
 * 
 * Why sessionStorage over localStorage?
 * - Won't persist stale data across sessions
 * - Takes up less space (not permanent)
 * - Same-origin policy for extra security
 */

import { getUserTTL } from './use-ttl-config';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
  provider: string;
  version: number; // for cache invalidation on code changes
}

const CACHE_VERSION = 1;
// Default TTL (can be overridden per provider)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'emailify_cache_';

// Provider-specific TTL configuration (milliseconds)
export const PROVIDER_TTL_CONFIG: Record<string, number> = {
  'all': 5 * 60 * 1000,        // 5 minutes - combined view (most volatile)
  'gmail': 60 * 60 * 1000,     // 60 minutes - personal email
  'microsoft': 60 * 60 * 1000, // 60 minutes - personal email
};

/**
 * Get TTL for a specific provider
 * Priority:
 * 1. User-configured TTL (from localStorage settings)
 * 2. Default hardcoded TTL (fallback)
 */
export const getProviderTTL = (provider: string): number => {
  try {
    // Try to get user-configured TTL first
    const userTTL = getUserTTL(provider);
    return userTTL;
  } catch (error) {
    // Fall back to hardcoded defaults if config loading fails
    console.warn(`[EmailCache] Failed to get user TTL for ${provider}, using default:`, error);
    return PROVIDER_TTL_CONFIG[provider] || DEFAULT_CACHE_TTL;
  }
};

/**
 * Check if cache entry is still valid
 * - Must exist
 * - Must not be expired (within TTL)
 * - Must match current cache version
 */
export const isCacheValid = <T>(entry: CacheEntry<T>): boolean => {
  if (!entry) return false;
  if (entry.version !== CACHE_VERSION) return false;
  
  const ageMs = Date.now() - entry.timestamp;
  const isExpired = ageMs > entry.ttl;
  
  return !isExpired;
};

/**
 * Get cache key with provider scope
 * Examples: emailify_cache_all, emailify_cache_gmail, emailify_cache_outlook
 */
const getCacheKey = (provider: string): string => {
  return `${CACHE_KEY_PREFIX}${provider}`;
};

/**
 * Get cached emails for a provider
 * Returns null if cache doesn't exist, is expired, or corrupted
 */
export const getCachedEmails = <T>(provider: string): T | null => {
  try {
    const cacheKey = getCacheKey(provider);
    const cached = sessionStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log(`[EmailCache] No cache found for provider: ${provider}`);
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache is still valid
    if (!isCacheValid(entry)) {
      const ageMs = Date.now() - entry.timestamp;
      const ageSeconds = Math.floor(ageMs / 1000);
      console.log(`[EmailCache] Cache expired for provider: ${provider} (age: ${ageSeconds}s, TTL: ${entry.ttl / 1000}s)`);
      
      // Clean up expired cache
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    
    const ageMs = Date.now() - entry.timestamp;
    const ageSeconds = Math.floor(ageMs / 1000);
    console.log(`[EmailCache] Using cached data for provider: ${provider} (age: ${ageSeconds}s, valid for: ${Math.ceil((entry.ttl - ageMs) / 1000)}s more)`);
    
    return entry.data;
  } catch (error) {
    console.error(`[EmailCache] Error reading cache for ${provider}:`, error);
    // Silently fail and return null - caller will fetch fresh
    sessionStorage.removeItem(getCacheKey(provider));
    return null;
  }
};

/**
 * Store emails in cache with TTL
 * Automatically overwrites existing cache for this provider
 * If ttl not provided, uses provider-specific TTL from PROVIDER_TTL_CONFIG
 */
export const setCachedEmails = <T>(provider: string, data: T, ttl: number = 0): void => {
  // Use provider-specific TTL if not explicitly provided
  const actualTtl = ttl > 0 ? ttl : getProviderTTL(provider);
  try {
    const cacheKey = getCacheKey(provider);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTtl,
      provider,
      version: CACHE_VERSION,
    };
    
    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
    const ttlMinutes = Math.round((actualTtl / 1000) / 60);
    console.log(`[EmailCache] Cached data for provider: ${provider} (will expire in ${ttlMinutes}m = ${actualTtl / 1000}s)`);
  } catch (error) {
    // Might fail if sessionStorage is full or unavailable
    console.error(`[EmailCache] Error writing cache for ${provider}:`, error);
  }
};

/**
 * Clear cache for specific provider
 * Used by "Refresh" button
 */
export const clearProviderCache = (provider: string): void => {
  try {
    const cacheKey = getCacheKey(provider);
    sessionStorage.removeItem(cacheKey);
    console.log(`[EmailCache] Cleared cache for provider: ${provider}`);
  } catch (error) {
    console.error(`[EmailCache] Error clearing cache for ${provider}:`, error);
  }
};

/**
 * Clear ALL cache (nuclear option)
 * Used if user clicks "Clear All Cache" button
 */
export const clearAllCache = (): void => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    console.log('[EmailCache] Cleared all email cache');
  } catch (error) {
    console.error('[EmailCache] Error clearing all cache:', error);
  }
};

/**
 * Get cache stats for debugging
 * Shows what's cached and how much space used
 */
export const getCacheStats = (): {
  providers: string[];
  totalSize: number;
  entries: { provider: string; ageMs: number; ttl: number; validMs: number }[];
} => {
  try {
    const entries: { provider: string; ageMs: number; ttl: number; validMs: number }[] = [];
    let totalSize = 0;
    const providers = new Set<string>();
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const entry = JSON.parse(cached) as CacheEntry<any>;
          const ageMs = Date.now() - entry.timestamp;
          const validMs = Math.max(0, entry.ttl - ageMs);
          
          entries.push({
            provider: entry.provider,
            ageMs,
            ttl: entry.ttl,
            validMs,
          });
          
          providers.add(entry.provider);
        }
      }
    });
    
    return {
      providers: Array.from(providers),
      totalSize,
      entries,
    };
  } catch (error) {
    console.error('[EmailCache] Error getting cache stats:', error);
    return { providers: [], totalSize: 0, entries: [] };
  }
};
