/**
 * OAuth Settings Form
 * Handles OAuth authentication for Gmail and Outlook in Settings page
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface OAuthSettingsFormProps {
  provider: 'gmail' | 'microsoft';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const OAuthSettingsForm: React.FC<OAuthSettingsFormProps> = ({
  provider,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleOAuthLogin = () => {
    console.log(`[OAuthSettings] Initiating ${provider} OAuth login`);
    // Map provider names to OAuth endpoint names
    // "gmail" → "google", "microsoft" → "microsoft"
    const oauthProvider = provider === 'gmail' ? 'google' : provider;
    // Directly redirect to the OAuth login endpoint
    // The endpoint will handle getting auth URL and redirecting to OAuth provider
    window.location.href = `/auth/${oauthProvider}/login?source=settings`;
  };

  const providerConfig = {
    gmail: {
      name: 'Gmail',
      icon: '📧',
      color: 'bg-red-500',
      description: 'Sign in with your Google account',
    },
    microsoft: {
      name: 'Outlook',
      icon: '📬',
      color: 'bg-blue-500',
      description: 'Sign in with your Microsoft account',
    },
  };

  const config = providerConfig[provider];

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className={`${config.color} text-white rounded-full w-10 h-10 flex items-center justify-center text-lg`}>
          {config.icon}
        </div>
        <div>
          <p className="font-medium text-sm">{config.name} OAuth Authentication</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {config.name} account connected successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleOAuthLogin}
          disabled={loading}
          className="flex-1"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <span className="mr-2">Sign in with {config.name}</span>
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="lg"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Benefits */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Benefits of OAuth:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>No password stored locally</li>
          <li>Automatic token refresh</li>
          <li>Secure 2FA compatible</li>
          <li>Easy to disconnect</li>
        </ul>
      </div>
    </div>
  );
};

export default OAuthSettingsForm;
