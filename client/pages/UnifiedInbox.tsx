import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { EmailList } from "@/components/EmailList";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Settings, Loader } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import type { Email } from "@/lib/mock-emails";

interface OAuthEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  provider: 'google' | 'microsoft';
}

interface OAuthAccount {
  provider: string;
  email: string;
  expiresAt: number;
  isExpired: boolean;
}

interface Provider {
  id: string;
  name: string;
  icon: string;
  emails?: Email[];
  hasOAuth?: boolean;
}

export default function UnifiedInbox() {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [oauthEmails, setOauthEmails] = useState<OAuthEmail[]>([]);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize providers from OAuth accounts on mount
  useEffect(() => {
    fetchOAuthAccounts();
  }, []);

  // Fetch emails when provider changes
  useEffect(() => {
    if (selectedProviderId === "all") {
      fetchAllOAuthEmails();
    } else if (oauthAccounts.length > 0) {
      // Only fetch if we have accounts loaded
      fetchOAuthEmails(selectedProviderId);
    }
  }, [selectedProviderId, oauthAccounts.length]);

  const fetchOAuthAccounts = async () => {
    try {
      const response = await fetch("/api/email/auth/status");
      const data = await response.json();
      
      if (data.success && data.data?.providers) {
        setOauthAccounts(data.data.providers);
        
        // Build providers list from OAuth accounts only
        const oauthProviders = data.data.providers.map((account: OAuthAccount) => ({
          id: account.provider === 'google' ? 'gmail' : 'microsoft',
          name: account.provider === 'google' ? 'Gmail' : 'Outlook',
          icon: account.provider === 'google' ? '📧' : '📬',
          hasOAuth: true,
        }));
        
        // Remove duplicates (in case multiple accounts from same provider)
        const uniqueProviders = Array.from(
          new Map(oauthProviders.map((p: Provider) => [p.id, p])).values()
        );
        
        setProviders(uniqueProviders);
      } else {
        setProviders([]);
        setOauthEmails([]);
      }
    } catch (error) {
      console.error('Failed to fetch OAuth accounts:', error);
      setProviders([]);
    }
  };

  const fetchAllOAuthEmails = async () => {
    setLoadingEmails(true);
    setError(null);
    try {
      const response = await fetch("/api/email/oauth/all?limit=20");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => ({
          id: email.id || `${email.provider}-${email.from}`,
          from: {
            name: email.from.split('<')[0].trim() || 'Unknown',
            email: email.from.match(/<(.+?)>/)?.[1] || email.from,
          },
          subject: email.subject || '(No Subject)',
          preview: email.preview || email.body?.substring(0, 200) || '',
          date: email.date || new Date().toISOString(),
          read: email.read || false,
          provider: email.provider === 'google' ? 'google' : 'microsoft',
        }));
        setOauthEmails(convertedEmails);
      } else {
        setOauthEmails([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('Failed to fetch all OAuth emails:', errorMessage);
      setError(errorMessage);
      setOauthEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchOAuthEmails = async (provider: string) => {
    setLoadingEmails(true);
    setError(null);
    try {
      // Find the email address for this provider
      const account = oauthAccounts.find(acc => 
        (provider === 'gmail' && acc.provider === 'google') ||
        (provider === 'microsoft' && acc.provider === 'microsoft')
      );

      if (!account) {
        setOauthEmails([]);
        setLoadingEmails(false);
        return;
      }

      const encodedEmail = encodeURIComponent(account.email);
      const response = await fetch(`/api/email/oauth/provider/${encodedEmail}?limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => ({
          id: email.id || `${provider}-${email.from}`,
          from: {
            name: email.from.split('<')[0].trim() || 'Unknown',
            email: email.from.match(/<(.+?)>/)?.[1] || email.from,
          },
          subject: email.subject || '(No Subject)',
          preview: email.preview || email.body?.substring(0, 200) || '',
          date: email.date || new Date().toISOString(),
          read: email.read || false,
          provider: provider === 'gmail' ? 'google' : 'microsoft',
        }));
        setOauthEmails(convertedEmails);
      } else {
        setOauthEmails([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('Failed to fetch OAuth emails:', errorMessage);
      setError(errorMessage);
      setOauthEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Convert OAuth emails to UI format
  const emails: Email[] = oauthEmails.map(email => ({
    id: email.id,
    from: email.from,
    subject: email.subject,
    preview: email.preview,
    date: new Date(email.date),
    read: email.read,
    providerName: email.provider === 'google' ? 'Gmail' : 'Outlook',
  }));

  // Sort emails by date (newest first)
  const sortedEmails = [...emails].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const unreadCount = sortedEmails.filter((email) => !email.read).length;
  
  const selectedProviderName = selectedProviderId === "all" 
    ? "All Emails"
    : providers.find(p => p.id === selectedProviderId)?.name || "Unified Inbox";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <UnifiedSidebar
        providers={providers}
        selectedProviderId={selectedProviderId}
        onProviderSelect={setSelectedProviderId}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedProviderName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sortedEmails.length} email{sortedEmails.length !== 1 ? "s" : ""} (
              {unreadCount} unread)
              {loadingEmails && " - Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loadingEmails && (
              <Loader className="w-4 h-4 animate-spin text-primary" />
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              title="Back to dashboard"
            >
              <Link to="/dashboard">
                <LayoutGrid className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              title="Settings"
            >
              <Link to="/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <ThemeDropdown />
            <SecurityButton />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <ErrorAlert
              message={error}
              details="Failed to load emails from your connected accounts. Check your connection and try again."
              onDismiss={() => setError(null)}
              onRetry={() => {
                if (selectedProviderId === "all") {
                  fetchAllOAuthEmails();
                } else {
                  fetchOAuthEmails(selectedProviderId);
                }
              }}
            />
          )}
          {providers.length === 0 ? (
            <div className="flex items-center justify-center h-full flex-col">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No email accounts connected</p>
                <Button asChild>
                  <Link to="/settings">Connect an email account</Link>
                </Button>
              </div>
            </div>
          ) : loadingEmails && sortedEmails.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Loading emails...</p>
              </div>
            </div>
          ) : sortedEmails.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <p className="text-muted-foreground">No emails to display</p>
              </div>
            </div>
          ) : (
            <EmailList
              emails={sortedEmails}
              selectedEmailId={selectedEmailId}
              onEmailSelect={(email) => setSelectedEmailId(email.id)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
