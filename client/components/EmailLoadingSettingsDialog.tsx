import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEmailLoadingConfig, EmailLoadingConfig } from '@/hooks/use-email-loading-config';

interface EmailLoadingSettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmailLoadingSettingsDialog({
  open = false,
  onOpenChange,
}: EmailLoadingSettingsDialogProps) {
  const { config, setEmailLoadingConfig, resetToDefaults } = useEmailLoadingConfig();
  const [batchSize, setBatchSize] = useState(config.batchSize);
  const [timeoutSeconds, setTimeoutSeconds] = useState(config.timeoutSeconds);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open) {
      setBatchSize(config.batchSize);
      setTimeoutSeconds(config.timeoutSeconds);
      setHasChanges(false);
    }
  }, [open]); // Only sync when dialog opens, not on config changes

  const handleBatchSizeChange = (value: number[]) => {
    const newSize = value[0];
    setBatchSize(newSize);
    setHasChanges(true);
  };

  const handleBatchSizeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
    setBatchSize(value);
    setHasChanges(true);
  };

  const handleTimeoutChange = (value: number[]) => {
    const newTimeout = value[0];
    setTimeoutSeconds(newTimeout);
    setHasChanges(true);
  };

  const handleTimeoutInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(30, Math.min(600, parseInt(e.target.value) || 90));
    setTimeoutSeconds(value);
    setHasChanges(true);
  };

  const handleBatchPreset = (value: number) => {
    setBatchSize(value);
    setHasChanges(true);
  };

  const handleTimeoutPreset = (value: number) => {
    setTimeoutSeconds(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    const newConfig: EmailLoadingConfig = {
      batchSize,
      timeoutSeconds,
    };
    setEmailLoadingConfig(newConfig);
    setHasChanges(false);
    onOpenChange?.(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setHasChanges(false);
  };

  const handleCancel = () => {
    setBatchSize(config.batchSize);
    setTimeoutSeconds(config.timeoutSeconds);
    setHasChanges(false);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Loading Settings</DialogTitle>
          <DialogDescription>
            Configure how Emailify loads emails from your accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Batch Size Section */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Size</CardTitle>
              <CardDescription>
                Number of emails to load per request (1-100)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Emails per request: {batchSize}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={batchSize}
                    onChange={handleBatchSizeInputChange}
                    className="w-20 text-center"
                  />
                </div>
                <Slider
                  value={[batchSize]}
                  onValueChange={handleBatchSizeChange}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground w-full">Quick presets:</span>
                {[5, 10, 20, 30, 50].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={batchSize === preset ? 'default' : 'outline'}
                    onClick={() => handleBatchPreset(preset)}
                  >
                    {preset} emails
                  </Button>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Larger batch sizes load more emails at once but may be slower.
                  Smaller batches load faster but use more requests.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeout Section */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Timeout</CardTitle>
              <CardDescription>
                Maximum time to wait before asking to continue (30-600 seconds)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Timeout: {timeoutSeconds} seconds</Label>
                  <Input
                    type="number"
                    min={30}
                    max={600}
                    value={timeoutSeconds}
                    onChange={handleTimeoutInputChange}
                    className="w-20 text-center"
                  />
                </div>
                <Slider
                  value={[timeoutSeconds]}
                  onValueChange={handleTimeoutChange}
                  min={30}
                  max={600}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground w-full">Quick presets:</span>
                {[30, 60, 90, 120, 180].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={timeoutSeconds === preset ? 'default' : 'outline'}
                    onClick={() => handleTimeoutPreset(preset)}
                  >
                    {preset} sec
                  </Button>
                ))}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-900 dark:text-yellow-100">
                    If loading takes longer than this timeout, you'll be asked if you want to continue waiting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Batch Size:</strong> {batchSize} emails per request
                </p>
                <p className="text-sm">
                  <strong>Timeout:</strong> {timeoutSeconds} seconds ({Math.floor(timeoutSeconds / 60)} min {timeoutSeconds % 60} sec)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="hover:bg-red-50 dark:hover:bg-red-950"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
