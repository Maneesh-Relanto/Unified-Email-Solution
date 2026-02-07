import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { EmailList } from "@/components/EmailList";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { StatusBar, useStatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Settings, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import type { Email } from "@/lib/mock-emails";

/**
 * Normalize email.from field to consistent { name, email } format
 * Handles both string format "Name <email@example.com>" and object format { name, email }
 */
function normalizeEmailFrom(from: any): { name: string; email: string } {
  // If already normalized object, return as-is
  if (typeof from === 'object' && from !== null && 'name' in from && 'email' in from) {
    return {
      name: from.name || 'Unknown Sender',
      email: from.email || 'unknown@example.com',
    };
  }

  // Handle string format "Name <email@example.com>"
  if (typeof from === 'string') {
    const match = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/^(.+)$/);
    if (match) {
      if (match.length === 3) {
        // Matched "Name <email>" format
        return {
          name: match[1].trim() || 'Unknown Sender',
          email: match[2].trim() || 'unknown@example.com',
        };
      } else {
        // Only got the email or name, treat as email if it contains @
        const value = match[1].trim();
        if (value.includes('@')) {
          return {
            name: 'Unknown Sender',
            email: value,
          };
        } else {
          return {
            name: value || 'Unknown Sender',
            email: 'unknown@example.com',
          };
        }
      }
    }
  }

  // Fallback for any other format
  return {
    name: 'Unknown Sender',
    email: 'unknown@example.com',
  };
}

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
  providerName: string;  // e.g., 'Gmail (OAuth)', 'Outlook (OAuth)'
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
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 30;
  
  // Status bar hook
  const statusBar = useStatusBar();

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
    // Reset to first page when provider changes
    setCurrentPage(1);
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
          emails: [], // Will be populated when emails are fetched
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

  // Update provider email counts after fetching
  const updateProviderCounts = (emails: OAuthEmail[]) => {
    console.log('[updateProviderCounts] Updating counts for', emails.length, 'emails');
    setProviders(prevProviders => 
      prevProviders.map(provider => {
        // Count emails for this provider by matching providerName
        const providerEmails = emails.filter(email => {
          // Gmail provider matches 'Gmail (OAuth)' or similar
          if (provider.id === 'gmail') return email.providerName?.toLowerCase().includes('gmail');
          // Microsoft/Outlook provider matches 'Outlook (OAuth)' or similar
          if (provider.id === 'microsoft') return email.providerName?.toLowerCase().includes('outlook');
          return false;
        });
        
        console.log(`[updateProviderCounts] Provider ${provider.id}: ${providerEmails.length} emails`);
        
        return {
          ...provider,
          emails: providerEmails,
        };
      })
    );
  };

  const fetchAllOAuthEmails = async () => {
    setLoadingEmails(true);
    setError(null);
    const loadingId = statusBar.showLoading('Loading emails from all accounts...');
    
    try {
      console.log('[UnifiedInbox] Fetching all OAuth emails...');
      const response = await fetch("/api/email/oauth/all?limit=20");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[UnifiedInbox] All emails response:', data);
      console.log('[UnifiedInbox] Sample email from field:', data.emails?.[0]?.from);
      console.log(`[UnifiedInbox] Total emails fetched: ${data.emails?.length || 0}`);

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => {
          // Normalize from field (handle both string and object formats)
          const normalizedFrom = normalizeEmailFrom(email.from);
          
          return {
            id: email.id || `${email.providerName}-${normalizedFrom.email}`,
            from: normalizedFrom,
            subject: email.subject || '(No Subject)',
            preview: email.preview || email.body?.substring(0, 200) || '',
            date: email.date || new Date().toISOString(),
            read: email.read || false,
            providerName: email.providerName || 'Unknown',
          };
        });
        console.log('[UnifiedInbox] Converted emails:', convertedEmails);
        console.log('[UnifiedInbox] Provider names:', convertedEmails.map(e => e.providerName));
        setOauthEmails(convertedEmails);
        
        // Update provider email counts by provider type
        updateProviderCounts(convertedEmails);
        
        statusBar.removeMessage(loadingId);
        statusBar.showSuccess(`Loaded ${convertedEmails.length} emails from all accounts`);
      } else {
        setOauthEmails([]);
        statusBar.removeMessage(loadingId);
        statusBar.showInfo('No emails found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('[UnifiedInbox] Failed to fetch all OAuth emails:', errorMessage);
      setError(errorMessage);
      setOauthEmails([]);
      statusBar.removeMessage(loadingId);
      statusBar.showError(errorMessage);
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchOAuthEmails = async (provider: string) => {
    setLoadingEmails(true);
    setError(null);
    const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
    const loadingId = statusBar.showLoading(`Loading emails from ${providerName}...`);
    
    try {
      // Find the email address for this provider
      const account = oauthAccounts.find(acc => 
        (provider === 'gmail' && acc.provider === 'google') ||
        (provider === 'microsoft' && acc.provider === 'microsoft')
      );

      if (!account) {
        console.warn('[UnifiedInbox] No account found for provider:', provider);
        setOauthEmails([]);
        setLoadingEmails(false);
        statusBar.removeMessage(loadingId);
        statusBar.showError(`No ${providerName} account connected`);
        return;
      }

      console.log(`[UnifiedInbox] Fetching ${provider} emails for:`, account.email);
      const encodedEmail = encodeURIComponent(account.email);
      const response = await fetch(`/api/email/oauth/provider/${encodedEmail}?limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[UnifiedInbox] ${provider} emails response:`, data);
      console.log('[UnifiedInbox] Sample email from field:', data.emails?.[0]?.from);
      console.log(`[UnifiedInbox] ${provider} emails count: ${data.emails?.length || 0}`);

      if (data.emails) {
        const convertedEmails: OAuthEmail[] = data.emails.map((email: any) => {
          // Normalize from field (handle both string and object formats)
          const normalizedFrom = normalizeEmailFrom(email.from);
          
          return {
            id: email.id || `${provider}-${normalizedFrom.email}`,
            from: normalizedFrom,
            subject: email.subject || '(No Subject)',
            preview: email.preview || email.body?.substring(0, 200) || '',
            date: email.date || new Date().toISOString(),
            read: email.read || false,
            providerName: email.providerName || 'Unknown',
          };
        });
        console.log('[UnifiedInbox] Converted emails:', convertedEmails);
        console.log('[UnifiedInbox] Provider names:', convertedEmails.map(e => e.providerName));
        setOauthEmails(convertedEmails);
        
        // Update provider email counts for this specific provider
        updateProviderCounts(convertedEmails);
        
        statusBar.removeMessage(loadingId);
        statusBar.showSuccess(`Loaded ${convertedEmails.length} emails from ${providerName}`);
      } else {
        setOauthEmails([]);
        statusBar.removeMessage(loadingId);
        statusBar.showInfo(`No emails found in ${providerName}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('[UnifiedInbox] Failed to fetch OAuth emails:', errorMessage);
      setError(errorMessage);
      setOauthEmails([]);
      statusBar.removeMessage(loadingId);
      statusBar.showError(errorMessage);
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
    providerName: email.providerName?.includes('Gmail') ? 'Gmail' : 'Outlook',
  }));

  // Sort emails by date (newest first)
  const sortedEmails = [...emails].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Pagination
  const totalPages = Math.ceil(sortedEmails.length / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = sortedEmails.slice(startIndex, endIndex);

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
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              {loadingEmails && " • Loading..."}
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
            <>
              <div className="flex-1 overflow-hidden">
                <EmailList
                  emails={paginatedEmails}
                  selectedEmailId={selectedEmailId}
                  onEmailSelect={(email) => setSelectedEmailId(email.id)}
                />
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, sortedEmails.length)} of {sortedEmails.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium px-3">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      {/* Status Bar */}
      <StatusBar
        messages={statusBar.messages}
        onDismiss={statusBar.removeMessage}
      />
    </div>
  );
}
