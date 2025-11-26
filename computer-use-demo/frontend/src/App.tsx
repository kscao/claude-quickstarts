import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar } from '@/components/Sidebar';
import { ChatView } from '@/components/ChatView';
import { HttpLogs } from '@/components/HttpLogs';
import { VncViewer } from '@/components/VncViewer';
import { useChat } from '@/hooks/useChat';
import { fetchConfig, validateAuth, resetEnvironment, fetchStoredApiKey } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MessageSquare, Globe, AlertTriangle, Loader2, PanelRightClose, PanelRight } from 'lucide-react';
import type { ApiKeyResponse, AppConfig, ConfigResponse } from '@/types';

const DEFAULT_CONFIG: AppConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-5-20250929',
  systemPromptSuffix: '',
  onlyNMostRecentImages: 3,
  maxTokens: 16384,
  toolVersion: 'computer_use_20250124',
  thinkingEnabled: false,
  thinkingBudget: 8192,
  hideImages: false,
  tokenEfficientToolsBeta: false,
};

// Get VNC URL from environment or default
const VNC_URL = import.meta.env.VITE_VNC_URL || 'http://localhost:6080';

function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [serverConfig, setServerConfig] = useState<ConfigResponse | null>(null);
  const [storedApiKey, setStoredApiKey] = useState<ApiKeyResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [vncCollapsed, setVncCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const { messages, httpLogs, isStreaming, sendMessage, stop, clearMessages } = useChat({
    config,
  });

  // Load server config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Fetch server config and stored API key in parallel
        const [serverCfg, apiKeyStatus] = await Promise.all([
          fetchConfig(),
          fetchStoredApiKey().catch(() => null),
        ]);

        setServerConfig(serverCfg);
        setStoredApiKey(apiKeyStatus);

        // Set default model and tool version from server config
        const defaultModel = serverCfg.default_models[config.provider];
        const modelConfig = serverCfg.model_configs[defaultModel];

        setConfig((prev) => ({
          ...prev,
          model: defaultModel || prev.model,
          toolVersion: modelConfig?.tool_version || prev.toolVersion,
        }));
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Validate auth when provider or API key changes
  useEffect(() => {
    const validate = async () => {
      try {
        const result = await validateAuth({
          provider: config.provider,
          api_key: config.apiKey || undefined,
        });
        setAuthError(result.valid ? null : result.error || 'Authentication failed');
      } catch (error) {
        setAuthError('Failed to validate authentication');
      }
    };
    validate();
  }, [config.provider, config.apiKey]);

  const handleConfigChange = (changes: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...changes }));
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await resetEnvironment();
      clearMessages();
      setConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Failed to reset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (message: string) => {
    if (authError) return;
    sendMessage(message);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        config={config}
        onConfigChange={handleConfigChange}
        onReset={handleReset}
        serverConfig={serverConfig}
        storedApiKey={storedApiKey}
        isLoading={isLoading || isStreaming}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content - Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <header className="shrink-0 h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            Claude Computer Use Demo
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVncCollapsed(!vncCollapsed)}
            className="gap-2"
          >
            {vncCollapsed ? (
              <>
                <PanelRight className="h-4 w-4" />
                Show Desktop
              </>
            ) : (
              <>
                <PanelRightClose className="h-4 w-4" />
                Hide Desktop
              </>
            )}
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Auth Error - properly contained */}
          {authError && (
            <div className="shrink-0 px-4 pt-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="shrink-0 px-4 pt-4">
              <TabsList className="w-fit">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="http" className="gap-2">
                  <Globe className="h-4 w-4" />
                  HTTP Exchange Logs
                  {httpLogs.length > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {httpLogs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <ChatView
                messages={messages}
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                onStop={stop}
                hideImages={config.hideImages}
              />
            </TabsContent>

            <TabsContent value="http" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <HttpLogs logs={httpLogs} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* VNC Viewer Panel */}
      {!vncCollapsed && (
        <aside className="w-[55%] min-w-[400px] max-w-[900px] shrink-0 h-full">
          <VncViewer vncUrl={VNC_URL} />
        </aside>
      )}
    </div>
  );
}

export default App;
