/**
 * OAuth Login Component
 * Displays Sign in with Google/Microsoft buttons
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface OAuthLoginComponentProps {
  onAuthStart?: () => void;
  onAuthError?: (error: string) => void;
}

export const OAuthLoginComponent: React.FC<OAuthLoginComponentProps> = ({
  onAuthStart,
  onAuthError,
}) => {
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error, setError] = useState<string>('');

  const initiateOAuthFlow = (provider: 'google' | 'microsoft') => {
    try {
      console.log(`[OAuth] Starting ${provider} authentication flow`);
      setLoading(provider);
      setError('');
      onAuthStart?.();

      // Directly navigate to the OAuth login endpoint
      // The server will handle the redirect to the OAuth provider
      const endpoint = `/auth/${provider}/login?source=integration`;
      console.log(`[OAuth] Redirecting to endpoint: ${endpoint}`);
      
      globalThis.location.href = endpoint;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[OAuth] Error for ${provider}:`, err);
      console.error(`[OAuth] Error message:`, errorMessage);
      setError(errorMessage);
      onAuthError?.(errorMessage);
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-4">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-2xl font-bold">Connect Email Accounts</h2>
        <p className="text-sm text-gray-600">
          Securely connect your Gmail or Outlook account
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* Google OAuth Button */}
        <Button
          onClick={() => initiateOAuthFlow('google')}
          disabled={loading !== null}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3"
        >
          {loading === 'google' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ctext x='12' y='20' font-size='20' fill='white' text-anchor='middle'%3EG%3C/text%3E%3C/svg%3E"
                alt="Google"
                className="w-5 h-5"
              />
              <span>Sign in with Google</span>
            </>
          )}
        </Button>

        {/* Microsoft OAuth Button */}
        <Button
          onClick={() => initiateOAuthFlow('microsoft')}
          disabled={loading !== null}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-3"
        >
          {loading === 'microsoft' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ctext x='12' y='20' font-size='20' fill='white' text-anchor='middle'%3E⊞%3C/text%3E%3C/svg%3E"
                alt="Microsoft"
                className="w-5 h-5"
              />
              <span>Sign in with Outlook</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center pt-4">
        <p>Your email credentials are never stored on our servers.</p>
        <p>OAuth tokens are encrypted and secured.</p>
      </div>
    </div>
  );
};

export default OAuthLoginComponent;
