import { useState } from "react";
import { Link } from "react-router-dom";
import { mockProviders } from "@/lib/mock-emails";
import { SidebarNav } from "@/components/SidebarNav";
import { EmailList } from "@/components/EmailList";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function Dashboard() {
  const [selectedProviderId, setSelectedProviderId] = useState("gmail");
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();

  const selectedProvider = mockProviders.find(
    (p) => p.id === selectedProviderId
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <SidebarNav
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
              {selectedProvider?.name} Inbox
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProvider?.emails.length} email
              {selectedProvider?.emails.length !== 1 ? "s" : ""}
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
          {selectedProvider && (
            <EmailList
              emails={selectedProvider.emails}
              selectedEmailId={selectedEmailId}
              onEmailSelect={(email) => setSelectedEmailId(email.id)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
