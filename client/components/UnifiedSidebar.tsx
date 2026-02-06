import { cn } from "@/lib/utils";
import { Provider } from "@/lib/mock-emails";
import { Mail } from "lucide-react";

interface UnifiedSidebarProps {
  providers: Provider[];
  selectedProviderId: string | "all";
  onProviderSelect: (providerId: string | "all") => void;
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
          <span className="text-xl">📬</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">All Providers</p>
            <p className="text-xs opacity-70">
              {providers.reduce((sum, p) => sum + p.emails.length, 0)} emails
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="my-2 border-t border-border"></div>

        {/* Individual Providers */}
        {providers.map((provider) => (
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
            <span className="text-xl">{provider.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{provider.name}</p>
              <p className="text-xs opacity-70">
                {provider.emails.length} emails
              </p>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <p>Sorted by date</p>
      </div>
    </aside>
  );
}
