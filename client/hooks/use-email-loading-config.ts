import { useState, useCallback } from 'react';

/**
 * Email loading configuration
 * Controls batch size and timeout for email fetching operations
 */
export interface EmailLoadingConfig {
  batchSize: number;        // Number of emails to load per request (default: 20)
  timeoutSeconds: number;   // Timeout for loading (default: 90 seconds)
}

const DEFAULT_CONFIG: EmailLoadingConfig = {
  batchSize: 20,
  timeoutSeconds: 90,
};

const STORAGE_KEY = 'emailify_email_loading_config';

/**
 * Get stored email loading config from localStorage
 * Falls back to defaults if not set
 */
export function getStoredEmailLoadingConfig(): EmailLoadingConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate values are in acceptable range
      return {
        batchSize: Math.max(1, Math.min(100, parsed.batchSize || DEFAULT_CONFIG.batchSize)),
        timeoutSeconds: Math.max(30, Math.min(600, parsed.timeoutSeconds || DEFAULT_CONFIG.timeoutSeconds)),
      };
    }
  } catch (error) {
    console.warn('[useEmailLoadingConfig] Failed to parse stored config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save email loading config to localStorage
 */
export function saveEmailLoadingConfig(config: EmailLoadingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[useEmailLoadingConfig] Failed to save config:', error);
  }
}

/**
 * Reset email loading config to defaults
 */
export function resetEmailLoadingConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[useEmailLoadingConfig] Failed to reset config:', error);
  }
}

/**
 * React hook for managing email loading configuration
 * Provides state management and persistence via localStorage
 */
export function useEmailLoadingConfig() {
  const [config, setConfig] = useState<EmailLoadingConfig>(getStoredEmailLoadingConfig());

  const setEmailLoadingConfig = useCallback((newConfig: EmailLoadingConfig) => {
    // Validate values
    const validatedConfig: EmailLoadingConfig = {
      batchSize: Math.max(1, Math.min(100, newConfig.batchSize)),
      timeoutSeconds: Math.max(30, Math.min(600, newConfig.timeoutSeconds)),
    };
    setConfig(validatedConfig);
    saveEmailLoadingConfig(validatedConfig);
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    resetEmailLoadingConfig();
  }, []);

  return {
    config,
    setEmailLoadingConfig,
    resetToDefaults,
    // Helpers for individual setting updates
    setBatchSize: (size: number) => {
      const newConfig = { ...config, batchSize: Math.max(1, Math.min(100, size)) };
      setEmailLoadingConfig(newConfig);
    },
    setTimeoutSeconds: (seconds: number) => {
      const newConfig = { ...config, timeoutSeconds: Math.max(30, Math.min(600, seconds)) };
      setEmailLoadingConfig(newConfig);
    },
  };
}

/**
 * Get email loading config without React (for use in utils, etc.)
 */
export function getEmailLoadingConfig(): EmailLoadingConfig {
  return getStoredEmailLoadingConfig();
}
