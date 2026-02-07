import { cn } from "@/lib/utils";
import { Mail, Inbox } from "lucide-react";

interface SidebarProvider {
  id: string;
  name: string;
  icon?: string;
  emails?: any[];
  color?: string;
  abbreviation?: string;
  hasOAuth?: boolean;
  email?: string; // Email address for the provider
}

interface UnifiedSidebarProps {
  providers: SidebarProvider[];
  selectedProviderId: string;
  onProviderSelect: (providerId: string) => void;
}

export function UnifiedSidebar({
  providers,
  selectedProviderId,
  onProviderSelect,
}: UnifiedSidebarProps) {
  return (
    <aside className="w-48 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Unified Inbox</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          All your emails in one place
        </p>
      </div>

      {/* Provider List */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* All Providers Option */}
        <button
          onClick={() => onProviderSelect("all")}
          className={cn(
            "w-full px-3 py-2 rounded-lg mb-1 text-left transition-all flex items-center gap-3",
            selectedProviderId === "all"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-foreground hover:bg-slate-200",
          )}
        >
          <Inbox className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">All Providers</p>
            <p className="text-xs opacity-70">
              {providers.reduce((sum, p) => sum + (p.emails?.length || 0), 0)} emails
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="my-2 border-t border-border"></div>

        {/* Individual Providers */}
        {providers.map((provider) => {
          const emailCount = provider.emails?.length || 0;
          const initials = provider.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase();

          return (
            <button
              key={provider.id}
              onClick={() => onProviderSelect(provider.id)}
              className={cn(
                "w-full px-3 py-2 rounded-lg mb-1 text-left transition-all flex items-center gap-3",
                selectedProviderId === provider.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-foreground hover:bg-slate-200",
              )}
            >
              {provider.icon ? (
                <span className="flex-shrink-0 text-lg">{provider.icon}</span>
              ) : (
                <div
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold",
                    provider.color || "bg-gray-500"
                  )}
                  title={provider.name}
                >
                  {provider.abbreviation || initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{provider.name}</p>
                {provider.email && (
                  <p className="text-[10px] text-muted-foreground truncate mb-0.5" title={provider.email}>
                    {provider.email}
                  </p>
                )}
                <p className="text-xs opacity-70">
                  {emailCount} email{emailCount !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <p>Sorted by date</p>
      </div>
    </aside>
  );
}
