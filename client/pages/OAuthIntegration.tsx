/**
 * OAuth Integration Page
 * Complete UI for OAuth login, account management, and email fetching
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OAuthLoginComponent } from '@/components/OAuth/OAuthLoginComponent';
import { OAuthAccountsPanel } from '@/components/OAuth/OAuthAccountsPanel';
import { OAuthEmailFetcher } from '@/components/OAuth/OAuthEmailFetcher';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const OAuthIntegrationPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [authMessage, setAuthMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Check if we're returning from OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('authenticated') === 'true') {
      setAuthMessage({
        type: 'success',
        text: '✓ Authentication successful! Your email account is now connected.',
      });
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh accounts
      triggerRefresh();
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleAuthError = (error: string) => {
    setAuthMessage({
      type: 'error',
      text: `Error: ${error}`,
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-bold">Email Integration</h1>
        <p className="text-gray-600">
          Connect your Gmail or Outlook account to view unified emails
        </p>
      </div>

      {/* Auth Message */}
      {authMessage && (
        <Alert variant={authMessage.type === 'success' ? 'default' : 'destructive'}>
          {authMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription>{authMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for different sections */}
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="login">Connect Account</TabsTrigger>
          <TabsTrigger value="accounts">My Accounts</TabsTrigger>
          <TabsTrigger value="emails">My Emails</TabsTrigger>
        </TabsList>

        {/* Connect Account Tab */}
        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <OAuthLoginComponent
                onAuthStart={() =>
                  setAuthMessage(null)
                }
                onAuthError={handleAuthError}
              />
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🔒</span> Security
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  ✓ OAuth tokens encrypted at rest
                </p>
                <p>
                  ✓ Passwords never stored
                </p>
                <p>
                  ✓ Automatic token refresh
                </p>
                <p>
                  ✓ Tokens expire after 1 hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">📧</span> Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  ✓ Read emails from Gmail
                </p>
                <p>
                  ✓ Read emails from Outlook
                </p>
                <p>
                  ✓ View unread emails
                </p>
                <p>
                  ✓ Connect multiple accounts
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <OAuthAccountsPanel
            key={refreshKey}
            onRefresh={triggerRefresh}
          />
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-4">
          <div className="space-y-4">
            {/* All Emails */}
            <div>
              <h3 className="text-lg font-semibold mb-3">All Connected Accounts</h3>
              <OAuthEmailFetcher
                key={`all_${refreshKey}`}
                limit={15}
                onRefresh={triggerRefresh}
              />
            </div>

            {/* Unread Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Unread Emails Only</h3>
              <OAuthEmailFetcher
                key={`unread_${refreshKey}`}
                limit={10}
                unreadOnly={true}
                onRefresh={triggerRefresh}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>1. Connect Account:</strong> Click "Sign in with Google" or "Sign in with Outlook" to securely authenticate.
          </p>
          <p>
            <strong>2. Grant Permissions:</strong> You'll be redirected to Google/Microsoft to approve email access.
          </p>
          <p>
            <strong>3. View Emails:</strong> Once connected, your emails will appear in the "My Emails" tab.
          </p>
          <p>
            <strong>4. Manage Accounts:</strong> View all connected accounts and disconnect anytime in the "My Accounts" tab.
          </p>
          <p className="font-semibold text-blue-600 pt-2">
            💡 Your login sessions are secure. Emailify never stores your password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthIntegrationPage;
