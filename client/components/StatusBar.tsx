import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusMessage {
  id?: string;
  type: "success" | "error" | "loading" | "info";
  text: string;
  duration?: number; // milliseconds, default 5000, 0 for persistent
}

interface StatusBarProps {
  messages: StatusMessage[];
  onDismiss?: (id: string) => void;
}

export function StatusBar({ messages, onDismiss }: StatusBarProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-96">
      {messages.map((message, index) => (
        <StatusBarMessage
          key={message.id || `status-${index}`}
          message={message}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface StatusBarMessageProps {
  message: StatusMessage;
  onDismiss?: (id: string) => void;
}

function StatusBarMessage({ message, onDismiss }: StatusBarMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = message.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (message.id && onDismiss) {
          setTimeout(() => onDismiss(message.id!), 300); // Wait for fade out
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!isVisible) return null;

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    loading: Loader2,
    info: Info,
  };

  const Icon = icons[message.type];

  const colorClasses = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    loading: "bg-blue-50 border-blue-200 text-blue-800",
    info: "bg-gray-50 border-gray-200 text-gray-800",
  };

  const iconColorClasses = {
    success: "text-green-600",
    error: "text-red-600",
    loading: "text-blue-600",
    info: "text-gray-600",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300",
        colorClasses[message.type],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 flex-shrink-0 mt-0.5",
          iconColorClasses[message.type],
          message.type === "loading" && "animate-spin"
        )}
      />
      <p className="flex-1 text-sm font-medium leading-relaxed">{message.text}</p>
      {message.id && onDismiss && message.type !== "loading" && (
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(message.id!), 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Hook to manage status messages
export function useStatusBar() {
  const [messages, setMessages] = useState<StatusMessage[]>([]);

  const addMessage = (message: Omit<StatusMessage, "id">) => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { ...message, id }]);
    return id;
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAll = () => {
    setMessages([]);
  };

  const showSuccess = (text: string, duration?: number) => {
    return addMessage({ type: "success", text, duration });
  };

  const showError = (text: string, duration?: number) => {
    return addMessage({ type: "error", text, duration });
  };

  const showLoading = (text: string, existingId?: string) => {
    if (existingId) {
      // Update existing message
      setMessages((prev) =>
        prev.map((m) => (m.id === existingId ? { ...m, text } : m))
      );
      return existingId;
    }
    // Create new message
    return addMessage({ type: "loading", text, duration: 0 });
  };

  const showInfo = (text: string, duration?: number) => {
    return addMessage({ type: "info", text, duration });
  };

  return {
    messages,
    addMessage,
    removeMessage,
    clearAll,
    showSuccess,
    showError,
    showLoading,
    showInfo,
  };
}
