/**
 * OAuth Accounts Panel
 * Displays connected OAuth accounts and allows disconnection
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Mail, Clock, AlertCircle } from 'lucide-react';

interface OAuthAccount {
  id: string;
  provider: string;
  email: string;
  expiresAt: number;
}

interface OAuthAccountsPanelProps {
  onRefresh?: () => void;
}

export const OAuthAccountsPanel: React.FC<OAuthAccountsPanelProps> = ({ onRefresh }) => {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [disconnecting, setDisconnecting] = useState<string>('');

  // Fetch connected accounts on mount
  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/email/auth/status');
      const data = await response.json();

      if (data.success && data.data?.providers) {
        setAccounts(data.data.providers);
        setError('');
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError('Unable to load connected accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: string, email: string) => {
    setDisconnecting(`${provider}_${email}`);

    try {
      const response = await fetch('/api/email/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email }),
      });

      if (response.ok) {
        setAccounts(
          accounts.filter((acc) => !(acc.provider === provider && acc.email === email))
        );
        onRefresh?.();
      } else {
        setError('Failed to disconnect account');
      }
    } catch (err) {
      setError('Error disconnecting account');
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting('');
    }
  };

  const getProviderIcon = (provider: string) => {
    return provider === 'google' ? '📧' : '💼';
  };

  const getProviderName = (provider: string) => {
    return provider === 'google' ? 'Gmail' : 'Outlook';
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining < 0) {
      return 'Expired';
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Connected Accounts ({accounts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No connected accounts</p>
            <p className="text-sm">Use the login buttons above to connect Gmail or Outlook</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={`${account.provider}_${account.email}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getProviderIcon(account.provider)}</span>
                    <span className="font-semibold">{getProviderName(account.provider)}</span>
                    <Badge variant="outline">{account.email}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    Token: {getTimeRemaining(account.expiresAt)}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDisconnect(account.provider, account.email)
                  }
                  disabled={!!disconnecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {disconnecting === `${account.provider}_${account.email}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OAuthAccountsPanel;
