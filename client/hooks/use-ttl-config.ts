/**
 * TTL Configuration Hook - Manages user-customizable cache TTL
 * 
 * Reads from localStorage and provides user-configured TTL values
 * Falls back to defaults if not configured
 */

import { useState, useCallback, useEffect } from 'react';
import { PROVIDER_TTL_CONFIG } from './use-email-cache';

export interface TTLConfig {
  all: number;
  gmail: number;
  microsoft: number;
}

// Default TTL values (in minutes for easier UI)
const DEFAULT_TTL_MINUTES: TTLConfig = {
  all: 5,          // 5 minutes
  gmail: 60,       // 60 minutes
  microsoft: 60,   // 60 minutes
};

const STORAGE_KEY = 'emailify_ttl_config';

/**
 * Convert minutes to milliseconds
 */
const minutesToMs = (minutes: number): number => {
  return minutes * 60 * 1000;
};

/**
 * Convert milliseconds to minutes (rounded)
 */
const msToMinutes = (ms: number): number => {
  return Math.round(ms / 60 / 1000);
};

/**
 * Get stored TTL configuration from localStorage
 * Returns user config if available, otherwise defaults
 */
export const getStoredTTLConfig = (): TTLConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // Validate that all required keys exist
      if (config.all !== undefined && config.gmail !== undefined && config.microsoft !== undefined) {
        return config;
      }
    }
  } catch (error) {
    console.error('[TTLConfig] Error reading from localStorage:', error);
  }
  
  return DEFAULT_TTL_MINUTES;
};

/**
 * Save TTL configuration to localStorage
 */
export const saveTTLConfig = (config: TTLConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('[TTLConfig] Saved TTL configuration:', config);
  } catch (error) {
    console.error('[TTLConfig] Error saving to localStorage:', error);
  }
};

/**
 * Reset TTL configuration to defaults
 */
export const resetTTLConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[TTLConfig] Reset to default TTL configuration');
  } catch (error) {
    console.error('[TTLConfig] Error resetting configuration:', error);
  }
};

/**
 * Convert TTL config (minutes) to milliseconds for use in cache
 */
export const convertTTLConfigToMs = (config: TTLConfig): Record<string, number> => {
  return {
    all: minutesToMs(config.all),
    gmail: minutesToMs(config.gmail),
    microsoft: minutesToMs(config.microsoft),
  };
};

/**
 * React Hook for managing TTL configuration
 * 
 * Usage:
 * const { ttlConfig, setTTLMinutes, resetToDefaults } = useTTLConfig();
 * 
 * // Update Gmail TTL to 90 minutes
 * setTTLMinutes('gmail', 90);
 */
export const useTTLConfig = () => {
  const [ttlConfig, setTTLConfig] = useState<TTLConfig>(DEFAULT_TTL_MINUTES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config on mount
  useEffect(() => {
    const stored = getStoredTTLConfig();
    setTTLConfig(stored);
    setIsLoaded(true);
    console.log('[useTTLConfig] Loaded configuration:', stored);
  }, []);

  // Update individual provider TTL (in minutes)
  const setTTLMinutes = useCallback((provider: keyof TTLConfig, minutes: number) => {
    // Validate input
    if (minutes < 1 || minutes > 1440) {
      console.warn(`[useTTLConfig] Invalid TTL: ${minutes}. Must be between 1-1440 minutes.`);
      return;
    }

    setTTLConfig(prev => {
      const updated = { ...prev, [provider]: minutes };
      saveTTLConfig(updated);
      console.log(`[useTTLConfig] Updated ${provider} TTL to ${minutes} minutes`);
      return updated;
    });
  }, []);

  // Get TTL in minutes for a provider
  const getTTLMinutes = useCallback((provider: keyof TTLConfig): number => {
    return ttlConfig[provider];
  }, [ttlConfig]);

  // Get TTL in milliseconds for a provider
  const getTTLMs = useCallback((provider: keyof TTLConfig): number => {
    return minutesToMs(ttlConfig[provider]);
  }, [ttlConfig]);

  // Reset all to defaults
  const resetToDefaults = useCallback(() => {
    resetTTLConfig();
    setTTLConfig(DEFAULT_TTL_MINUTES);
    console.log('[useTTLConfig] Reset to defaults');
  }, []);

  // Sync TTL across providers (for "All" to match minimum of others)
  const syncAllToMinimum = useCallback(() => {
    const minTTL = Math.min(ttlConfig.gmail, ttlConfig.microsoft);
    setTTLMinutes('all', minTTL);
  }, [ttlConfig, setTTLMinutes]);

  // Sync all providers to same TTL
  const syncAllProviders = useCallback((minutes: number) => {
    setTTLConfig(prev => {
      const updated = { all: minutes, gmail: minutes, microsoft: minutes };
      saveTTLConfig(updated);
      console.log('[useTTLConfig] Synced all providers to', minutes, 'minutes');
      return updated;
    });
  }, []);

  return {
    ttlConfig,
    isLoaded,
    setTTLMinutes,
    getTTLMinutes,
    getTTLMs,
    resetToDefaults,
    syncAllToMinimum,
    syncAllProviders,
  };
};

/**
 * Get user-configured TTL for cache (called by cache system)
 * Returns in milliseconds
 */
export const getUserTTL = (provider: string): number => {
  const config = getStoredTTLConfig();
  const providerKey = provider as keyof TTLConfig;
  
  if (config[providerKey] !== undefined) {
    return minutesToMs(config[providerKey]);
  }
  
  // Fallback to hardcoded defaults
  return PROVIDER_TTL_CONFIG[provider] || PROVIDER_TTL_CONFIG['all'];
};
