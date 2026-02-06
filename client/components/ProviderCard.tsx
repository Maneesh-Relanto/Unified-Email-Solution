import { cn } from "@/lib/utils";

interface ProviderCardProps {
  id: string;
  name: string;
  icon: string;
  totalEmails: number;
  unreadEmails: number;
  onClick: () => void;
}

export function ProviderCard({
  id,
  name,
  icon,
  totalEmails,
  unreadEmails,
  onClick,
}: ProviderCardProps) {
  const unreadPercentage = totalEmails > 0 ? (unreadEmails / totalEmails) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg",
        "bg-card border-border hover:border-primary cursor-pointer"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-4xl mb-2">{icon}</div>
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Inbox</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        {/* Total Emails */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Emails</p>
            <p className="text-2xl font-bold text-primary">{totalEmails}</p>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Unread Emails */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-muted-foreground">Unread</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-accent">{unreadEmails}</p>
              <p className="text-xs text-muted-foreground">
                ({unreadPercentage.toFixed(0)}%)
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${unreadPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center hover:text-foreground transition-colors">
          View Details →
        </p>
      </div>
    </button>
  );
}
