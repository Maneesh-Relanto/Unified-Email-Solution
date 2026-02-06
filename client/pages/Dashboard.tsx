import { useState } from "react";
import { Link } from "react-router-dom";
import { mockProviders } from "@/lib/mock-emails";
import { SidebarNav } from "@/components/SidebarNav";
import { EmailList } from "@/components/EmailList";
import { DashboardOverview } from "@/components/DashboardOverview";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { Button } from "@/components/ui/button";
import { Home, LayoutGrid, Inbox } from "lucide-react";

export default function Dashboard() {
  const [selectedProviderId, setSelectedProviderId] = useState<
    string | undefined
  >(undefined);
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();

  const selectedProvider = selectedProviderId
    ? mockProviders.find((p) => p.id === selectedProviderId)
    : undefined;

  const isOverviewMode = !selectedProviderId;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation - Hidden in overview mode */}
      {!isOverviewMode && (
        <SidebarNav
          providers={mockProviders}
          selectedProviderId={selectedProviderId || "gmail"}
          onProviderSelect={setSelectedProviderId}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
          <div>
            {isOverviewMode ? (
              <>
                <h2 className="text-2xl font-bold text-foreground">
                  Dashboard
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select an email provider to view
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedProvider?.name} Inbox
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProvider?.emails.length} email
                  {selectedProvider?.emails.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOverviewMode ? (
              <Button asChild variant="outline" size="sm" title="View unified inbox">
                <Link to="/unified-inbox" className="gap-2">
                  <Inbox className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProviderId(undefined)}
                title="Back to dashboard overview"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            )}
            <Button asChild variant="outline" size="sm" title="Go to home page">
              <Link to="/">
                <Home className="w-4 h-4" />
              </Link>
            </Button>
            <ThemeDropdown />
            <SecurityButton />
          </div>
        </div>

        {/* Content */}
        {isOverviewMode ? (
          <DashboardOverview onProviderSelect={setSelectedProviderId} />
        ) : (
          <div className="flex-1 overflow-hidden">
            {selectedProvider && (
              <EmailList
                emails={selectedProvider.emails}
                selectedEmailId={selectedEmailId}
                onEmailSelect={(email) => setSelectedEmailId(email.id)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
