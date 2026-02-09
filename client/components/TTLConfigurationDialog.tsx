/**
 * TTL Configuration Dialog Component
 * Allows users to customize cache TTL for each email provider
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTTLConfig, type TTLConfig } from '@/hooks/use-ttl-config';

interface TTLConfigurationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TTL_PRESETS = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: '120 min', value: 120 },
];

export function TTLConfigurationDialog({ open, onOpenChange }: TTLConfigurationProps) {
  const { ttlConfig, isLoaded, setTTLMinutes, resetToDefaults, syncAllToMinimum } = useTTLConfig();
  const [localConfig, setLocalConfig] = useState<TTLConfig>(ttlConfig);
  const [syncMode, setSyncMode] = useState<'independent' | 'minimum' | 'all'>('independent');

  // Sync local config when dialog opens
  useEffect(() => {
    if (open && isLoaded) {
      setLocalConfig(ttlConfig);
    }
  }, [open, isLoaded]); // Sync when dialog opens, don't depend on ttlConfig to avoid loops

  const handleSave = () => {
    // Apply changes
    setTTLMinutes('all', localConfig.all);
    setTTLMinutes('gmail', localConfig.gmail);
    setTTLMinutes('microsoft', localConfig.microsoft);
    
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalConfig({
      all: 5,
      gmail: 60,
      microsoft: 60,
    });
  };

  const handleSyncMinimum = () => {
    const minTTL = Math.min(localConfig.gmail, localConfig.microsoft);
    setLocalConfig(prev => ({ ...prev, all: minTTL }));
  };

  const handleSyncAll = (value: number) => {
    setLocalConfig({
      all: value,
      gmail: value,
      microsoft: value,
    });
  };

  const updateProvider = (provider: keyof TTLConfig, value: number) => {
    if (value >= 1 && value <= 1440) {
      setLocalConfig(prev => ({ ...prev, [provider]: value }));
    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🕐 Cache TTL Configuration
          </DialogTitle>
          <DialogDescription>
            Customize how long emails are cached before requiring a fresh fetch from the server.
            Longer TTL = fewer API calls but potentially stale data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> For personal emails (Gmail, Outlook), longer TTL (60-120 min) is usually fine.
              For "All Emails" view, shorter TTL (5-15 min) helps catch new messages across providers faster.
            </AlertDescription>
          </Alert>

          {/* Sync Mode Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sync Mode</CardTitle>
              <CardDescription>Choose how to manage TTL across providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={syncMode === 'independent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncMode('independent')}
                >
                  Independent
                </Button>
                <Button
                  variant={syncMode === 'minimum' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSyncMode('minimum');
                    handleSyncMinimum();
                  }}
                >
                  All = Minimum
                </Button>
                <Button
                  variant={syncMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncMode('all')}
                >
                  Sync All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync All Providers Mode */}
          {syncMode === 'all' && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm">Set All Providers to Same TTL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="all-sync-slider">TTL Value: {localConfig.all} minutes</Label>
                  <Slider
                    id="all-sync-slider"
                    min={1}
                    max={1440}
                    step={1}
                    value={[localConfig.all]}
                    onValueChange={([val]) => handleSyncAll(val)}
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-2">
                    {TTL_PRESETS.map(preset => (
                      <Button
                        key={preset.value}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSyncAll(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Provider Configuration */}
          {syncMode !== 'all' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* All Emails */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📧 All Emails</CardTitle>
                  <CardDescription>Combined view from all providers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="all-ttl">TTL: {localConfig.all} minutes</Label>
                    <Slider
                      id="all-ttl"
                      min={1}
                      max={1440}
                      step={1}
                      value={[localConfig.all]}
                      onValueChange={([val]) => updateProvider('all', val)}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={localConfig.all}
                      onChange={(e) => updateProvider('all', parseInt(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TTL_PRESETS.map(preset => (
                      <Button
                        key={preset.value}
                        variant={localConfig.all === preset.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProvider('all', preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gmail */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📨 Gmail</CardTitle>
                  <CardDescription>Google personal email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gmail-ttl">TTL: {localConfig.gmail} minutes</Label>
                    <Slider
                      id="gmail-ttl"
                      min={1}
                      max={1440}
                      step={1}
                      value={[localConfig.gmail]}
                      onValueChange={([val]) => updateProvider('gmail', val)}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={localConfig.gmail}
                      onChange={(e) => updateProvider('gmail', parseInt(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TTL_PRESETS.map(preset => (
                      <Button
                        key={preset.value}
                        variant={localConfig.gmail === preset.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProvider('gmail', preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Outlook */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📬 Outlook</CardTitle>
                  <CardDescription>Microsoft personal email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="microsoft-ttl">TTL: {localConfig.microsoft} minutes</Label>
                    <Slider
                      id="microsoft-ttl"
                      min={1}
                      max={1440}
                      step={1}
                      value={[localConfig.microsoft]}
                      onValueChange={([val]) => updateProvider('microsoft', val)}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={localConfig.microsoft}
                      onChange={(e) => updateProvider('microsoft', parseInt(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TTL_PRESETS.map(preset => (
                      <Button
                        key={preset.value}
                        variant={localConfig.microsoft === preset.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProvider('microsoft', preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Configuration Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📊 Summary</CardTitle>
                  <CardDescription>Current configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">All Emails:</span>
                    <span className="font-medium">{localConfig.all} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gmail:</span>
                    <span className="font-medium">{localConfig.gmail} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outlook:</span>
                    <span className="font-medium">{localConfig.microsoft} min</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="flex-1 md:flex-none gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
