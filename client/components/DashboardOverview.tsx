import { Link } from "react-router-dom";
import { ProviderCard } from "@/components/ProviderCard";
import { Button } from "@/components/ui/button";
import { mockProviders } from "@/lib/mock-emails";
import { Inbox } from "lucide-react";

interface DashboardOverviewProps {
  onProviderSelect: (providerId: string) => void;
}

export function DashboardOverview({
  onProviderSelect,
}: DashboardOverviewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-foreground">
            Unified Email Dashboard
          </h2>
          <Button asChild size="sm">
            <Link to="/unified-inbox" className="gap-2">
              <Inbox className="w-4 h-4" />
              Unified Inbox
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground">
          View and manage emails from all your accounts
        </p>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl">
          {mockProviders.map((provider) => {
            const unreadCount = provider.emails.filter(
              (email) => !email.read
            ).length;

            return (
              <ProviderCard
                key={provider.id}
                id={provider.id}
                name={provider.name}
                icon={provider.icon}
                totalEmails={provider.emails.length}
                unreadEmails={unreadCount}
                onClick={() => onProviderSelect(provider.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
