import { Email, mockProviders } from "@/lib/mock-emails";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from "date-fns";

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect?: (email: Email) => void;
}

// Helper to categorize emails by date
function categorizeByDate(emails: Email[]) {
  const categories: {
    label: string;
    emails: Email[];
  }[] = [];

  const today: Email[] = [];
  const yesterday: Email[] = [];
  const thisWeek: Email[] = [];
  const earlier: Email[] = [];

  emails.forEach((email) => {
    const emailDate = new Date(email.date);
    if (isToday(emailDate)) {
      today.push(email);
    } else if (isYesterday(emailDate)) {
      yesterday.push(email);
    } else if (isThisWeek(emailDate)) {
      thisWeek.push(email);
    } else {
      earlier.push(email);
    }
  });

  if (today.length > 0) categories.push({ label: "Today", emails: today });
  if (yesterday.length > 0) categories.push({ label: "Yesterday", emails: yesterday });
  if (thisWeek.length > 0) categories.push({ label: "This Week", emails: thisWeek });
  if (earlier.length > 0) categories.push({ label: "Earlier", emails: earlier });

  return categories;
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
}: EmailListProps) {
  const categorizedEmails = categorizeByDate(emails);
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Email List */}
      <div className="flex-1 overflow-y-auto divide-y border-t">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <p className="text-center">No emails found</p>
          </div>
        ) : (
          categorizedEmails.map((category) => (
            <div key={category.label}>
              {/* Date Category Header */}
              <div className="sticky top-0 bg-gray-100 px-4 py-2 border-b">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {category.label}
                </p>
              </div>
              {/* Emails in this category */}
              {category.emails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  onClick={() => onEmailSelect?.(email)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}

function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const initials = email.from.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarColor = email.from.avatar || "bg-gray-400";

  // Get provider info if this email has a providerName
  const providerInfo = email.providerName
    ? mockProviders.find(
        (p) =>
          p.name.toLowerCase() === email.providerName?.toLowerCase(),
      )
    : null;

  // Format time as HH:MM
  const emailTime = format(new Date(email.date), "HH:mm");
  const relativeTime = formatDistanceToNow(new Date(email.date), { addSuffix: false });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-4 border-transparent",
        isSelected && "bg-blue-50 border-l-blue-500",
        !email.read && "font-semibold"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium",
            avatarColor
          )}
        >
          {initials}
        </div>

        {/* Email Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm truncate",
                !email.read ? "font-semibold text-foreground" : "text-foreground"
              )}
            >
              {email.from.name}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {providerInfo && (
                <span
                  className={cn(
                    "text-[10px] font-normal text-white px-1 py-0.5 rounded uppercase tracking-wide inline-block scale-[0.7] origin-center",
                    providerInfo.color
                  )}
                  title={providerInfo.name}
                  style={{ margin: '-2px' }}
                >
                  {providerInfo.name}
                </span>
              )}
              <span 
                className="text-xs text-muted-foreground whitespace-nowrap"
                title={relativeTime}
              >
                {emailTime}
              </span>
            </div>
          </div>

          <p
            className={cn(
              "text-sm truncate mt-1",
              !email.read
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {email.subject}
          </p>

          <p className="text-xs text-muted-foreground truncate mt-1">
            {email.preview}
          </p>
        </div>

        {/* Unread Indicator */}
        {!email.read && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
        )}
      </div>
    </button>
  );
}
