import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, RotateCcw, ChevronLeft, ChevronRight, Check, Key } from 'lucide-react';
import type { ApiKeyResponse, AppConfig, Provider, ConfigResponse } from '@/types';

interface SidebarProps {
  config: AppConfig;
  onConfigChange: (config: Partial<AppConfig>) => void;
  onReset: () => void;
  serverConfig: ConfigResponse | null;
  storedApiKey: ApiKeyResponse | null;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  config,
  onConfigChange,
  onReset,
  serverConfig,
  storedApiKey,
  isLoading,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [modelConfig, setModelConfig] = useState<{
    max_output_tokens: number;
    has_thinking: boolean;
  } | null>(null);

  useEffect(() => {
    if (serverConfig?.model_configs && config.model) {
      const mc = serverConfig.model_configs[config.model];
      if (mc) {
        setModelConfig({
          max_output_tokens: mc.max_output_tokens,
          has_thinking: mc.has_thinking,
        });
      }
    }
  }, [config.model, serverConfig]);

  const handleProviderChange = (provider: Provider) => {
    const defaultModel = serverConfig?.default_models[provider] || config.model;
    onConfigChange({ provider, model: defaultModel });
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-12 border-r border-border bg-card flex flex-col items-center py-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-72 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header - same height as main header (h-16) */}
      <div className="shrink-0 h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <span className="font-semibold">Settings</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API Provider
            </Label>
            <div className="flex flex-col gap-2">
              {serverConfig?.providers.map((provider) => (
                <label
                  key={provider}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="provider"
                    value={provider}
                    checked={config.provider === provider}
                    onChange={() => handleProviderChange(provider as Provider)}
                    className="text-primary"
                  />
                  <span className="capitalize text-sm">{provider}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Model
            </Label>
            <Select
              value={config.model}
              onValueChange={(value) => {
                const mc = serverConfig?.model_configs[value];
                onConfigChange({
                  model: value,
                  toolVersion: mc?.tool_version || config.toolVersion,
                  maxTokens: mc?.default_output_tokens || config.maxTokens,
                });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {serverConfig?.model_configs && Object.keys(serverConfig.model_configs).map((modelName) => (
                  <SelectItem key={modelName} value={modelName} className="text-sm font-mono">
                    {modelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key (only for Anthropic) */}
          {config.provider === 'anthropic' && (
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Claude API Key
              </Label>

              {/* Show if key is configured via .env */}
              {storedApiKey?.has_key && !config.apiKey && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Using key from .env
                    </span>
                    {storedApiKey.masked_key && (
                      <span className="text-muted-foreground ml-1 font-mono">
                        ({storedApiKey.masked_key})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => onConfigChange({ apiKey: e.target.value })}
                placeholder={storedApiKey?.has_key ? "Override .env key..." : "sk-ant-..."}
                className="text-sm"
              />

              {!storedApiKey?.has_key && !config.apiKey && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  Add ANTHROPIC_API_KEY to .env file
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Recent Images */}
          <div className="space-y-2">
            <Label htmlFor="recentImages" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Only send N most recent images
            </Label>
            <Input
              id="recentImages"
              type="number"
              min={0}
              value={config.onlyNMostRecentImages}
              onChange={(e) =>
                onConfigChange({ onlyNMostRecentImages: parseInt(e.target.value) || 0 })
              }
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Reduce tokens by removing older screenshots
            </p>
          </div>

          {/* System Prompt Suffix */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custom System Prompt Suffix
            </Label>
            <Textarea
              id="systemPrompt"
              value={config.systemPromptSuffix}
              onChange={(e) => onConfigChange({ systemPromptSuffix: e.target.value })}
              placeholder="Additional instructions..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Hide Images Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="hideImages" className="text-sm">Hide screenshots</Label>
            <Switch
              id="hideImages"
              checked={config.hideImages}
              onCheckedChange={(checked) => onConfigChange({ hideImages: checked })}
            />
          </div>

          {/* Token Efficient Tools Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="tokenEfficient" className="text-sm">Token-efficient tools beta</Label>
            <Switch
              id="tokenEfficient"
              checked={config.tokenEfficientToolsBeta}
              onCheckedChange={(checked) =>
                onConfigChange({ tokenEfficientToolsBeta: checked })
              }
            />
          </div>

          <Separator />

          {/* Tool Version */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tool Version
            </Label>
            <Select
              value={config.toolVersion}
              onValueChange={(value) => onConfigChange({ toolVersion: value })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serverConfig?.tool_versions.map((version) => (
                  <SelectItem key={version} value={version} className="text-sm">
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Max Output Tokens
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min={1}
              max={modelConfig?.max_output_tokens || 128000}
              value={config.maxTokens}
              onChange={(e) =>
                onConfigChange({ maxTokens: parseInt(e.target.value) || 16384 })
              }
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Thinking Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="thinking" className="text-sm">Thinking Enabled</Label>
            <Switch
              id="thinking"
              checked={config.thinkingEnabled}
              onCheckedChange={(checked) => onConfigChange({ thinkingEnabled: checked })}
              disabled={!modelConfig?.has_thinking}
            />
          </div>

          {/* Thinking Budget */}
          {config.thinkingEnabled && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Thinking Budget
                </Label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {config.thinkingBudget.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[config.thinkingBudget]}
                onValueChange={([value]) => onConfigChange({ thinkingBudget: value })}
                min={1000}
                max={modelConfig?.max_output_tokens || 64000}
                step={1000}
                disabled={!config.thinkingEnabled}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reset Button - fixed at bottom */}
      <div className="shrink-0 p-4 border-t border-border">
        <Button
          variant="destructive"
          className="w-full"
          onClick={onReset}
          disabled={isLoading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
