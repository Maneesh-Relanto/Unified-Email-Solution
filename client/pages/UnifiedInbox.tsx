import { useState } from "react";
import { Link } from "react-router-dom";
import { mockProviders, type Email } from "@/lib/mock-emails";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { EmailList } from "@/components/EmailList";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { Button } from "@/components/ui/button";
import { Home, LayoutGrid } from "lucide-react";

export default function UnifiedInbox() {
  const [selectedProviderId, setSelectedProviderId] = useState<
    string | "all"
  >("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();

  // Get emails based on selected provider
  const getEmails = (): Email[] => {
    if (selectedProviderId === "all") {
      // Combine emails from all providers
      const allEmails = mockProviders.flatMap((provider) =>
        provider.emails.map((email) => ({
          ...email,
          providerName: provider.name,
        }))
      );
      return allEmails;
    } else {
      // Get emails from selected provider
      const provider = mockProviders.find((p) => p.id === selectedProviderId);
      return provider?.emails || [];
    }
  };

  // Sort emails by date (newest first)
  const emails = getEmails().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const unreadCount = emails.filter((email) => !email.read).length;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <UnifiedSidebar
        providers={mockProviders}
        selectedProviderId={selectedProviderId}
        onProviderSelect={setSelectedProviderId}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedProviderId === "all"
                ? "All Emails"
                : `${mockProviders.find((p) => p.id === selectedProviderId)?.name} Emails`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {emails.length} email{emails.length !== 1 ? "s" : ""} (
              {unreadCount} unread)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" title="Go to home page">
              <Link to="/">
                <Home className="w-4 h-4" />
              </Link>
            </Button>
            <ThemeDropdown />
            <SecurityButton />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-hidden">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={(email) => setSelectedEmailId(email.id)}
          />
        </div>
      </main>
    </div>
  );
}
