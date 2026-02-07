/**
 * OAuth Email Fetcher Component
 * Fetches and displays emails from OAuth-connected accounts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, RefreshCw, AlertCircle } from 'lucide-react';

interface ParsedEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  providerName: string;
}

interface FetchResponse {
  success: boolean;
  provider?: string;
  email?: string;
  count: number;
  emails: ParsedEmail[];
  errors?: string[];
}

interface OAuthEmailFetcherProps {
  email?: string;
  limit?: number;
  unreadOnly?: boolean;
  onRefresh?: () => void;
}

export const OAuthEmailFetcher: React.FC<OAuthEmailFetcherProps> = ({
  email,
  limit = 10,
  unreadOnly = false,
  onRefresh,
}) => {
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [endpoint, setEndpoint] = useState('');

  // Set endpoint based on props
  useEffect(() => {
    if (email) {
      setEndpoint(
        `/api/email/oauth/provider/${encodeURIComponent(email)}?limit=${limit}${
          unreadOnly ? '&unreadOnly=true' : ''
        }`
      );
    } else {
      setEndpoint(`/api/email/oauth/all?limit=${limit}${unreadOnly ? '&unreadOnly=true' : ''}`);
    }
  }, [email, limit, unreadOnly]);

  const fetchOAuthEmails = async () => {
    if (!endpoint) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(endpoint);
      const data: FetchResponse = await response.json();

      if (data.success) {
        setEmails(data.emails || []);
      } else {
        setError('Failed to fetch emails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount or when endpoint changes
  useEffect(() => {
    if (endpoint) {
      fetchOAuthEmails();
    }
  }, [endpoint]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {email ? `Emails from ${email}` : 'All OAuth Emails'} ({emails.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOAuthEmails}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No emails found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`p-4 border rounded-lg hover:bg-gray-50 transition ${
                  email.read ? 'opacity-70' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{email.from.name || email.from.email}</div>
                    <div className="text-sm text-gray-600 truncate">{email.from.email}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(email.date)}
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{email.subject}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{email.preview}</p>

                <div className="flex items-center gap-2">
                  <Badge variant={email.read ? 'outline' : 'default'}>
                    {email.read ? 'Read' : 'Unread'}
                  </Badge>
                  <Badge variant="secondary">{email.providerName}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OAuthEmailFetcher;
