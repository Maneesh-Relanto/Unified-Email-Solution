import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ProviderCard } from "@/components/ProviderCard";
import { Button } from "@/components/ui/button";
import { Inbox, Loader, Plus } from "lucide-react";

interface DashboardOverviewProps {
  onProviderSelect: (providerId: string) => void;
}

interface Account {
  email: string;
  provider: string;
  configured: boolean;
}

interface ProviderData {
  name: string;
  icon: string;
  totalEmails: number;
  unreadEmails: number;
  providerKey: string;
  email: string;
  protocol: 'OAuth' | 'IMAP';
}

const PROVIDER_CONFIG: Record<string, { name: string; icon: string }> = {
  gmail: { name: "Gmail", icon: "📧" },
  yahoo: { name: "Yahoo", icon: "📨" },
  outlook: { name: "Outlook", icon: "📬" },
  rediff: { name: "Rediff", icon: "🔴" },
  google: { name: "Gmail", icon: "📧" },
  microsoft: { name: "Outlook", icon: "📬" },
};

export function DashboardOverview({
  onProviderSelect,
}: DashboardOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountsAndCounts();
  }, []);

  async function fetchAccountsAndCounts() {
    try {
      setLoading(true);
      setError(null);

      // Fetch configured accounts (both IMAP and OAuth) - FAST
      const accountsResponse = await fetch("/api/email/configured");
      const accountsData = await accountsResponse.json();

      // Fetch OAuth accounts - FAST
      const oauthResponse = await fetch("/api/email/auth/status");
      const oauthData = await oauthResponse.json();
      
      // Combine all accounts
      const allAccounts: Account[] = [];
      if (accountsData.success && accountsData.accounts) {
        allAccounts.push(...accountsData.accounts);
      }
      if (oauthData.success && oauthData.data?.providers) {
        const oauthAccounts = oauthData.data.providers.map((provider: any) => ({
          email: provider.email,
          provider: provider.provider,
          configured: true,
        }));
        allAccounts.push(...oauthAccounts);
      }

      if (allAccounts.length === 0) {
        setProviders([]);
        setLoading(false);
        setLoadingCounts(false);
        return;
      }

      // Build provider data from accounts WITHOUT counts (show cards immediately)
      const initialProviders: ProviderData[] = allAccounts.map((account: Account) => {
        const normalizedProvider = account.provider.toLowerCase();
        const providerKey = normalizedProvider === "microsoft" ? "outlook" : 
                           normalizedProvider === "google" ? "gmail" : 
                           normalizedProvider;
        
        const config = PROVIDER_CONFIG[providerKey] || { 
          name: account.provider.toUpperCase(), 
          icon: "📧" 
        };
        
        const isOAuth = account.provider === 'google' || account.provider === 'microsoft';

        return {
          name: config.name,
          icon: config.icon,
          totalEmails: 0, // Will be updated
          unreadEmails: 0, // Will be updated
          providerKey,
          email: account.email,
          protocol: isOAuth ? 'OAuth' : 'IMAP',
        };
      });

      // Remove duplicates by email
      const providerMap = new Map<string, ProviderData>();
      initialProviders.forEach(p => providerMap.set(p.email, p));
      
      // Show cards immediately with loading state for counts
      setProviders(Array.from(providerMap.values()));
      setLoading(false);

      // Now fetch email counts in background (SLOW)
      setLoadingCounts(true);
      fetchEmailCounts(Array.from(providerMap.values()));
    } catch (err) {
      console.error("Error fetching providers:", err);
      setError("Failed to load providers");
      setLoading(false);
      setLoadingCounts(false);
    }
  }

  async function fetchEmailCounts(currentProviders: ProviderData[]) {
    try {
      // Fetch all emails to count - this is the slow part
      const emailsResponse = await fetch("/api/email/oauth/all?limit=20");
      const emailsData = await emailsResponse.json();

      // Group emails by provider
      const emailsByProvider: Record<string, any[]> = {};
      if (emailsData.success && emailsData.emails) {
        emailsData.emails.forEach((email: any) => {
          const providerName = email.providerName?.toLowerCase() || "";
          // Extract provider key (gmail, outlook, yahoo, rediff)
          let providerKey = "";
          if (providerName.includes("gmail")) providerKey = "gmail";
          else if (providerName.includes("outlook")) providerKey = "outlook";
          else if (providerName.includes("yahoo")) providerKey = "yahoo";
          else if (providerName.includes("rediff")) providerKey = "rediff";

          if (providerKey) {
            emailsByProvider[providerKey] = emailsByProvider[providerKey] || [];
            emailsByProvider[providerKey].push(email);
          }
        });
      }

      // Update providers with counts
      const updatedProviders = currentProviders.map(provider => {
        const emails = emailsByProvider[provider.providerKey] || [];
        const unreadCount = emails.filter((e: any) => !e.read).length;

        return {
          ...provider,
          totalEmails: emails.length,
          unreadEmails: unreadCount,
        };
      });

      setProviders(updatedProviders);
    } catch (err) {
      console.error("Error fetching email counts:", err);
      // Keep cards visible even if counts fail
    } finally {
      setLoadingCounts(false);
    }
  }

  async function fetchProvidersWithCounts() {
    // Legacy function for retry button
    await fetchAccountsAndCounts();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={fetchProvidersWithCounts} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-start">
        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Accounts Connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your email accounts to start managing your inbox in one place
              </p>
            </div>
            <Button asChild>
              <Link to="/settings" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Email Account
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.email}
                id={provider.providerKey}
                name={provider.name}
                icon={provider.icon}
                totalEmails={provider.totalEmails}
                unreadEmails={provider.unreadEmails}
                email={provider.email}
                protocol={provider.protocol}
                loadingCounts={loadingCounts}
                onClick={() => onProviderSelect(provider.providerKey)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

