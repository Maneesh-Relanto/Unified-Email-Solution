import { useState, useCallback } from 'react';

interface ApiError {
  message: string;
  status?: number;
  details?: string;
}

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (url: string, options?: RequestInit) => Promise<T | null>;
  clearError: () => void;
}

/**
 * Custom hook for making API calls with consistent error handling
 * Handles network errors, HTTP errors, and parsing errors
 */
export function useApiCall<T = any>(): UseApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(
    async (url: string, options: RequestInit = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });

        if (!response.ok) {
          let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
          let errorDetails = '';

          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorDetails = errorData.details || errorData.troubleshooting || '';
          } catch {
            // Response body is not JSON, use status text
          }

          setError({
            message: errorMessage,
            status: response.status,
            details: errorDetails,
          });
          setData(null);
          return null;
        }

        // Try to parse response as JSON
        let result: T;
        try {
          result = await response.json();
        } catch {
          setError({
            message: 'Failed to parse server response',
            status: response.status,
            details: 'The server returned invalid data',
          });
          setData(null);
          return null;
        }

        setData(result);
        return result;
      } catch (err) {
        // Network error or other fetch error
        const networkError = err instanceof Error ? err.message : 'Unknown error occurred';
        setError({
          message: 'Network error',
          details: networkError.includes('fetch') 
            ? 'Check your internet connection'
            : networkError,
        });
        setData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { data, loading, error, execute, clearError };
}
