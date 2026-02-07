import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorAlertProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  message,
  details,
  onDismiss,
  onRetry,
  className = '',
}: ErrorAlertProps) {
  return (
    <div
      className={`bg-destructive/10 border border-destructive/30 rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">{message}</h3>
            {details && (
              <p className="text-sm text-destructive/80 mt-1">{details}</p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-destructive/60 hover:text-destructive flex-shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
