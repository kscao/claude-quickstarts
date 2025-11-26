import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, Square, AlertTriangle, Bot, User, Wrench, Brain, Terminal, Image as ImageIcon } from 'lucide-react';
import type { DisplayMessage } from '@/types';

interface ChatViewProps {
  messages: DisplayMessage[];
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  hideImages: boolean;
}

export function ChatView({
  messages,
  onSendMessage,
  isStreaming,
  onStop,
  hideImages,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Find the viewport element inside ScrollArea (Radix adds data attribute)
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderMessageContent = (message: DisplayMessage) => {
    const content = message.content;

    switch (content.type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words overflow-hidden">{content.text}</div>
        );

      case 'thinking':
        return (
          <div className="bg-muted/50 rounded-md p-3 border border-border overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Brain className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wide">Thinking</span>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {content.thinking}
            </div>
          </div>
        );

      case 'tool_use':
        return (
          <div className="bg-secondary/50 rounded-md p-3 border border-border font-mono text-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Terminal className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold truncate">{content.name}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {content.id.slice(-8)}
              </Badge>
            </div>
            <pre className="text-xs overflow-x-auto bg-background/50 p-2 rounded whitespace-pre-wrap break-all">
              {JSON.stringify(content.input, null, 2)}
            </pre>
          </div>
        );

      case 'tool_result':
        return (
          <div className="space-y-2 overflow-hidden">
            {content.output && (
              <div className="bg-muted/30 rounded-md p-3 font-mono text-sm overflow-hidden">
                <pre className="whitespace-pre-wrap break-words overflow-x-auto">{content.output}</pre>
              </div>
            )}
            {content.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{content.error}</AlertDescription>
              </Alert>
            )}
            {content.base64Image && !hideImages && (
              <div className="mt-2">
                <img
                  src={`data:image/png;base64,${content.base64Image}`}
                  alt="Screenshot"
                  className="max-w-full rounded-md border border-border shadow-sm"
                />
              </div>
            )}
            {content.base64Image && hideImages && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ImageIcon className="h-4 w-4" />
                <span>Screenshot hidden</span>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{content.error}</AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-5 w-5" />;
      case 'assistant':
        return <Bot className="h-5 w-5" />;
      case 'tool':
        return <Wrench className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-primary/10 border-primary/20';
      case 'assistant':
        return 'bg-card border-border';
      case 'tool':
        return 'bg-secondary/30 border-secondary';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Warning Banner - contained within padding */}
      <div className="shrink-0 px-4 pt-4">
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
            Security Alert: Never provide access to sensitive accounts or data, as malicious web content can hijack Claude's behavior
          </AlertDescription>
        </Alert>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Send a message to start controlling the computer...</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 p-4 rounded-lg border overflow-hidden ${getMessageStyle(message.role)}`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getMessageIcon(message.role)}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium capitalize">{message.role}</span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {renderMessageContent(message)}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Claude is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to send to Claude to control the computer..."
            disabled={isStreaming}
            className="flex-1"
          />
          {isStreaming ? (
            <Button type="button" variant="destructive" onClick={onStop}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
