import { cn } from "@/lib/utils";
import { Provider } from "@/lib/mock-emails";

interface SidebarNavProps {
  providers: Provider[];
  selectedProviderId: string;
  onProviderSelect: (providerId: string) => void;
}

export function SidebarNav({
  providers,
  selectedProviderId,
  onProviderSelect,
}: SidebarNavProps) {
  return (
    <aside className="w-48 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Email Analyzer</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Unified email management
        </p>
      </div>

      {/* Provider List */}
      <nav className="flex-1 overflow-y-auto p-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onProviderSelect(provider.id)}
            className={cn(
              "w-full px-3 py-2 rounded-lg mb-1 text-left transition-all flex items-center gap-3",
              selectedProviderId === provider.id
                ? "bg-blue-500 text-white shadow-md"
                : "text-foreground hover:bg-slate-200"
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
        <p>No real data - Mock content only</p>
      </div>
    </aside>
  );
}
