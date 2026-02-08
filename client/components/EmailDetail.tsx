import { X, Reply, Forward, Trash2, Archive, AlertCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Email } from "@/lib/mock-emails";
import { useState } from "react";

interface EmailDetailProps {
  email: Email | undefined;
  onClose?: () => void;
  onEmailAction?: (action: "archive" | "delete" | "read", emailId: string) => void;
  userEmail?: string;
  provider?: string;
}

export function EmailDetail({ email, onClose, onEmailAction, userEmail, provider }: EmailDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionComplete, setActionComplete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!email) {
    return (
      <div className="hidden lg:flex flex-col h-full bg-gray-50 border-l items-center justify-center">
        <p className="text-muted-foreground text-center">
          Select an email to read
        </p>
      </div>
    );
  }

  const initials = email.from.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarColor = email.from.avatar || "bg-gray-400";

  const handleAction = async (action: "archive" | "delete" | "markRead" | "markUnread") => {
    if (!userEmail || !provider) {
      setError("User email or provider not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = action === "archive"
        ? `/api/email/${provider}/${email.id}/archive?email=${encodeURIComponent(userEmail)}`
        : action === "delete"
        ? `/api/email/${provider}/${email.id}?email=${encodeURIComponent(userEmail)}`
        : `/api/email/${provider}/${email.id}/read?email=${encodeURIComponent(userEmail)}&read=${action === "markRead" ? "true" : "false"}`;

      const method = action === "delete" ? "DELETE" : action === "archive" ? "POST" : "PUT";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action} email`);
      }

      setActionComplete(action);
      setTimeout(() => setActionComplete(null), 2000);

      if (action === "archive" || action === "delete") {
        onEmailAction?.(action, email.id);
        setTimeout(() => onClose?.(), 500);
      } else {
        onEmailAction?.(action === "markRead" ? "read" : "read", email.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Action error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l lg:border-l lg:border-gray-200">
      {/* Header with Close Button */}
      <div className="flex lg:hidden items-center justify-between p-4 border-b bg-white">
        <h2 className="text-sm font-semibold truncate">Email</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="Close email"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Email Header Section */}
        <div className="px-6 py-6 border-b bg-gray-50">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 break-words">
            {email.subject}
          </h1>

          {/* Sender Info */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium",
                avatarColor
              )}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-semibold text-gray-900">
                  {email.from.name}
                </span>
                <span className="text-gray-500 ml-1">&lt;{email.from.email}&gt;</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
              </p>
              {email.providerName && (
                <p className="text-xs text-gray-500 mt-1">
                  Via {email.providerName}
                </p>
              )}
            </div>
          </div>

          {/* Email Metadata */}
          <div className="text-sm text-gray-600 space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-fit">To:</span>
              <span className="break-words">your.email@example.com</span>
            </div>
          </div>

          {/* Unread Badge */}
          {!email.read && (
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Unread
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Email Body - Full Content with HTML Support */}
        <div className="px-6 py-6 prose prose-sm max-w-none">
          {/* Prioritize HTML content, fallback to body, then preview */}
          {email.html ? (
            <div
              className="text-gray-700 break-words leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.html }}
            />
          ) : email.body ? (
            <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {email.body}
            </p>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {email.preview}
            </p>
          )}
        </div>

        {/* Placeholder for Attachments */}
        {/* In future versions, this will show actual attachments */}
      </div>

      {/* Action Bar */}
      <div className="border-t bg-white px-6 py-4 flex gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => console.log("Reply")}
          disabled={isLoading}
        >
          <Reply className="w-4 h-4" />
          <span className="hidden sm:inline">Reply</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => console.log("Forward")}
          disabled={isLoading}
        >
          <Forward className="w-4 h-4" />
          <span className="hidden sm:inline">Forward</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => handleAction("archive")}
          disabled={isLoading}
        >
          {actionComplete === "archive" ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Archived</span>
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Archiving...</span>
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
          onClick={() => handleAction("delete")}
          disabled={isLoading}
        >
          {actionComplete === "delete" ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Deleted</span>
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
