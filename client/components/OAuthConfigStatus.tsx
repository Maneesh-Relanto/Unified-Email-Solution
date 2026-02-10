/**
 * OAuth Configuration Status Component
 * Displays which OAuth providers (Gmail, Outlook) are configured in the server
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OAuthProviderConfig {
  configured: boolean;
  provider: string;
  redirectUri: string;
}

interface OAuthConfigData {
  google: OAuthProviderConfig;
  microsoft: OAuthProviderConfig;
}

export const OAuthConfigStatus: React.FC = () => {
  const [config, setConfig] = useState<OAuthConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchOAuthConfig();
  }, []);

  const fetchOAuthConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/oauth-config');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.error || 'Failed to fetch OAuth configuration');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('OAuth config fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            OAuth Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!config) return null;

  const allConfigured = config.google.configured && config.microsoft.configured;
  const noneConfigured = !config.google.configured && !config.microsoft.configured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          OAuth Provider Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        {allConfigured && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All OAuth providers are configured and ready to use
            </AlertDescription>
          </Alert>
        )}

        {noneConfigured && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              No OAuth providers configured. Please add credentials to <code className="font-mono text-xs">confidential/.env</code>
            </AlertDescription>
          </Alert>
        )}

        {/* Provider Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gmail Status */}
          <div className={`p-4 rounded-lg border ${
            config.google.configured
              ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {config.google.configured ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">📧 Gmail OAuth</p>
                <p className={`text-xs ${
                  config.google.configured ? 'text-green-700 dark:text-green-300' : 'text-gray-500'
                }`}>
                  {config.google.configured ? 'Ready' : 'Not Configured'}
                </p>
              </div>
            </div>
            {config.google.configured && (
              <div className="text-xs text-muted-foreground mt-2">
                <p className="font-mono text-[10px] break-all">{config.google.redirectUri}</p>
              </div>
            )}
            {!config.google.configured && (
              <div className="text-xs text-muted-foreground mt-2">
                <p>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to <code>.env</code></p>
              </div>
            )}
          </div>

          {/* Outlook Status */}
          <div className={`p-4 rounded-lg border ${
            config.microsoft.configured
              ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {config.microsoft.configured ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">📬 Outlook OAuth</p>
                <p className={`text-xs ${
                  config.microsoft.configured ? 'text-green-700 dark:text-green-300' : 'text-gray-500'
                }`}>
                  {config.microsoft.configured ? 'Ready' : 'Not Configured'}
                </p>
              </div>
            </div>
            {config.microsoft.configured && (
              <div className="text-xs text-muted-foreground mt-2">
                <p className="font-mono text-[10px] break-all">{config.microsoft.redirectUri}</p>
              </div>
            )}
            {!config.microsoft.configured && (
              <div className="text-xs text-muted-foreground mt-2">
                <p>Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to <code>.env</code></p>
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        {!allConfigured && (
          <div className="text-xs text-muted-foreground space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="font-medium text-blue-900 dark:text-blue-200">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>Edit <code className="font-mono">confidential/.env</code></li>
              <li>Add OAuth credentials from Google Cloud Console / Azure Portal</li>
              <li>Restart the development server</li>
              <li>Return here to verify configuration</li>
            </ol>
            <p className="text-xs mt-2">
              📖 See <code>docs/OAUTH_IMPLEMENTATION.md</code> for detailed setup guide
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OAuthConfigStatus;
