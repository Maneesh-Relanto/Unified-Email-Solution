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
  email?: string; // Email address for the provider account
}

export default function UnifiedInbox() {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [oauthEmails, setOauthEmails] = useState<OAuthEmail[]>([]);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const emailsPerPage = 20;
  const INITIAL_LOAD = 20;
  const LOAD_MORE_BATCH = 30;
  
  // Status bar hook
  const statusBar = useStatusBar();

  // Initialize providers from OAuth accounts on mount
  useEffect(() => {
    fetchOAuthAccounts();
  }, []);

  // Fetch emails when provider changes (only after accounts are loaded)
  useEffect(() => {
    if (!accountsLoaded) return; // Don't fetch until accounts are loaded
    
    if (selectedProviderId === "all") {
      fetchAllOAuthEmails();
    } else {
      fetchOAuthEmails(selectedProviderId);
    }
    // Reset to first page when provider changes
    setCurrentPage(1);
  }, [selectedProviderId, accountsLoaded]);

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
          email: account.email, // Include email address for sidebar display
          emails: [], // Will be populated when emails are fetched
        }));
        
        // Remove duplicates (in case multiple accounts from same provider)
        const uniqueProviders = Array.from(
          new Map(oauthProviders.map((p: Provider) => [p.id, p])).values()
        );
        
        setProviders(uniqueProviders);
        setAccountsLoaded(true); // Mark accounts as loaded
      } else {
        setProviders([]);
        setOauthEmails([]);
        setAccountsLoaded(true); // Still mark as loaded even if empty
      }
    } catch (error) {
      console.error('Failed to fetch OAuth accounts:', error);
      setProviders([]);
      setAccountsLoaded(true); // Mark as loaded to prevent hanging
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

  const fetchAllOAuthEmails = async (isLoadMore: boolean = false) => {
    if (loadingEmails || loadingMore) return; // Prevent duplicate calls
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingEmails(true);
      setOauthEmails([]); // Clear existing emails on fresh load
      setHasMore(true);
    }
    setError(null);
    
    const startTime = Date.now();
    let messageStep = 0;
    
    const skip = isLoadMore ? oauthEmails.length : 0;
    const limit = isLoadMore ? LOAD_MORE_BATCH : INITIAL_LOAD;
    
    // Show initial message immediately
    const loadingId = statusBar.showLoading('🔌 Contacting server... (0s)');
    
    // Update message every 1 second with elapsed time
    const messages = [
      '🔌 Contacting server',
      '📬 Authenticating',
      '📨 Reading your emails',
      '📊 Processing email data',
      '⏳ Almost there',
    ];
    
    const updateInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      messageStep = Math.min(messageStep + 1, messages.length - 1);
      statusBar.showLoading(`${messages[messageStep]}... (${elapsed}s)`, loadingId);
    }, 1500);
    
    try {
      console.log(`[UnifiedInbox] Fetching OAuth emails (skip: ${skip}, limit: ${limit})...`);
      const response = await fetch(`/api/email/oauth/all?limit=${limit}&skip=${skip}`);
      
      // Clear interval
      clearInterval(updateInterval);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[UnifiedInbox] All emails response:', data);
      console.log('[UnifiedInbox] Sample email from field:', data.emails?.[0]?.from);
      console.log(`[UnifiedInbox] Emails fetched: ${data.emails?.length || 0}, hasMore: ${data.hasMore}`);

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
        
        // Append or replace emails based on load type
        let finalEmailList: OAuthEmail[];
        let newEmailsCount = convertedEmails.length;
        if (isLoadMore) {
          // Deduplicate: only add emails that don't already exist
          const existingIds = new Set(oauthEmails.map(e => e.id));
          const newEmails = convertedEmails.filter(email => !existingIds.has(email.id));
          newEmailsCount = newEmails.length;
          console.log(`[UnifiedInbox] Deduplication: ${convertedEmails.length} fetched, ${newEmails.length} new, ${convertedEmails.length - newEmails.length} duplicates skipped`);
          finalEmailList = [...oauthEmails, ...newEmails];
          setOauthEmails(finalEmailList);
        } else {
          finalEmailList = convertedEmails;
          setOauthEmails(convertedEmails);
        }
        
        // Update hasMore flag - if we got fewer NEW emails than requested, might not have more
        setHasMore(data.hasMore === true && newEmailsCount > 0);
        
        // Update provider email counts by provider type
        updateProviderCounts(finalEmailList);
        
        statusBar.removeMessage(loadingId);
        if (isLoadMore) {
          if (newEmailsCount > 0) {
            statusBar.showSuccess(`Loaded ${newEmailsCount} more email${newEmailsCount !== 1 ? 's' : ''}`);
          } else {
            statusBar.showInfo('No new emails to load');
          }
        } else {
          statusBar.showSuccess(`Loaded ${convertedEmails.length} emails${data.hasMore ? ' (more available)' : ''}`);
        }
      } else {
        if (!isLoadMore) {
          setOauthEmails([]);
        }
        setHasMore(false);
        statusBar.removeMessage(loadingId);
        statusBar.showInfo('No emails found');
      }
    } catch (error) {
      // Clear interval on error
      clearInterval(updateInterval);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emails';
      console.error('[UnifiedInbox] Failed to fetch all OAuth emails:', errorMessage);
      setError(errorMessage);
      if (!isLoadMore) {
        setOauthEmails([]);
      }
      statusBar.removeMessage(loadingId);
      statusBar.showError(errorMessage);
    } finally {
      setLoadingEmails(false);
      setLoadingMore(false);
    }
  };

  const fetchOAuthEmails = async (provider: string) => {
    if (loadingEmails) return; // Prevent duplicate calls
    
    setLoadingEmails(true);
    setError(null);
    const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
    
    const startTime = Date.now();
    let messageStep = 0;
    
    // Show initial message immediately
    const loadingId = statusBar.showLoading(`🔌 Connecting to ${providerName}... (0s)`);
    
    // Update message every 1.2 seconds
    const messages = [
      `🔌 Connecting to ${providerName}`,
      `🔑 Authenticating ${providerName}`,
      `📬 Reading ${providerName} emails`,
      `📊 Loading email data`,
    ];
    
    const updateInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      messageStep = Math.min(messageStep + 1, messages.length - 1);
      statusBar.showLoading(`${messages[messageStep]}... (${elapsed}s)`, loadingId);
    }, 1200);
    
    try {
      clearInterval(updateInterval); // Clear if completes quickly
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
      const response = await fetch(`/api/email/oauth/provider/${encodedEmail}?limit=200`);
      
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
      clearInterval(updateInterval); // Clear interval on error
      
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

  // Load more emails (wrapper for clarity)
  const loadMoreEmails = () => {
    if (selectedProviderId === "all") {
      fetchAllOAuthEmails(true);
    } else {
      // For single provider, we'll need to implement similar logic
      // For now, just reload all
      fetchOAuthEmails(selectedProviderId);
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
  const shouldShowPagination = sortedEmails.length > emailsPerPage;
  const totalPages = Math.ceil(sortedEmails.length / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = shouldShowPagination ? sortedEmails.slice(startIndex, endIndex) : sortedEmails;

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
              Showing {sortedEmails.length} email{sortedEmails.length !== 1 ? "s" : ""} (
              {unreadCount} unread)
              {hasMore && " • More available"}
              {shouldShowPagination && ` • Page ${currentPage} of ${totalPages}`}
              {(loadingEmails || loadingMore) && " • Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(loadingEmails || loadingMore) && (
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
                  fetchAllOAuthEmails(false);
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
              
              {/* Load More Button */}
              {hasMore && !loadingEmails && (
                <div className="border-t border-border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 px-6 py-4">
                  <Button
                    onClick={loadMoreEmails}
                    disabled={loadingMore}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                  >
                    {loadingMore ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        Loading more emails...
                      </>
                    ) : (
                      <>
                        📨 Load More Emails ({LOAD_MORE_BATCH} more)
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    {sortedEmails.length} emails loaded so far
                  </p>
                </div>
              )}
              
              {/* Pagination Controls */}
              {shouldShowPagination && (
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
