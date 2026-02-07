import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

interface ProviderCardProps {
  id: string;
  name: string;
  icon: string;
  totalEmails: number;
  unreadEmails: number;
  onClick: () => void;
  email?: string;
  protocol?: 'OAuth' | 'IMAP';
}

export function ProviderCard({
  id,
  name,
  icon,
  totalEmails,
  unreadEmails,
  onClick,
  email,
  protocol,
}: ProviderCardProps) {
  const unreadPercentage =
    totalEmails > 0 ? (unreadEmails / totalEmails) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-xl",
        "bg-gradient-to-br from-card to-card/50 border-border hover:border-primary cursor-pointer",
        "relative overflow-hidden group"
      )}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-5xl">{icon}</div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-foreground mb-1">{name}</h3>
              {protocol && (
                <span 
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: protocol === 'OAuth' 
                      ? 'rgba(59, 130, 246, 0.15)' 
                      : 'rgba(168, 85, 247, 0.15)',
                    color: protocol === 'OAuth' 
                      ? 'rgb(59, 130, 246)' 
                      : 'rgb(168, 85, 247)'
                  }}
                >
                  {protocol}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Email ID */}
        {email && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-foreground font-medium truncate">{email}</p>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="space-y-3">
          {/* Total Emails */}
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Emails</p>
              <p className="text-3xl font-bold text-primary">{totalEmails}</p>
            </div>
            <div className="w-full bg-primary/20 rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Unread Emails */}
          <div className="bg-orange-500/5 rounded-lg p-3 border border-orange-500/20">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Unread</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{unreadEmails}</p>
                <p className="text-xs text-muted-foreground font-medium">
                  ({unreadPercentage.toFixed(0)}%)
                </p>
              </div>
            </div>
            <div className="w-full bg-orange-500/20 rounded-full h-2.5">
              <div
                className="bg-orange-600 dark:bg-orange-400 h-2.5 rounded-full transition-all"
                style={{ width: `${unreadPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-primary text-center group-hover:translate-x-1 transition-transform flex items-center justify-center gap-2">
            View Inbox
            {" "}
            <span className="text-lg">→</span>
          </p>
        </div>
      </div>
    </button>
  );
}
