import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, AlertCircle } from 'lucide-react';

interface EmailLoadingTimeoutDialogProps {
  open?: boolean;
  onContinue?: () => void;
  onCancel?: () => void;
  elapsedSeconds?: number;
  timeoutSeconds?: number;
}

export function EmailLoadingTimeoutDialog({
  open = false,
  onContinue,
  onCancel,
  elapsedSeconds = 90,
  timeoutSeconds = 90,
}: EmailLoadingTimeoutDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <AlertDialogTitle>Email Loading Taking Longer</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            <div className="space-y-2">
              <p>
                Email loading has been running for <strong>{elapsedSeconds} seconds</strong> 
                (timeout set to {timeoutSeconds} seconds).
              </p>
              <p className="text-sm text-muted-foreground">
                This might happen if your email provider is responding slowly or you have many emails.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You can continue waiting or cancel the operation.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Stop Loading
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Waiting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
