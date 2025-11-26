import { useState, useCallback, useRef } from 'react';
import type {
  AppConfig,
  ChatMessage,
  DisplayMessage,
  DisplayContent,
  HttpLogEntry,
  SSEMessageEvent,
  SSEThinkingEvent,
  SSEToolUseEvent,
  SSEToolResultEvent,
  SSEHttpLogEvent,
  SSEErrorEvent,
  SSEDoneEvent,
} from '@/types';

interface UseChatOptions {
  config: AppConfig;
}

interface UseChatReturn {
  messages: DisplayMessage[];
  httpLogs: HttpLogEntry[];
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  stop: () => void;
  clearMessages: () => void;
}

export function useChat({ config }: UseChatOptions): UseChatReturn {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [httpLogs, setHttpLogs] = useState<HttpLogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addDisplayMessage = useCallback((role: 'user' | 'assistant' | 'tool', content: DisplayContent) => {
    const message: DisplayMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setDisplayMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const addHttpLog = useCallback((data: SSEHttpLogEvent) => {
    const log: HttpLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      request: data.request,
      response: data.response,
      error: data.error,
    };
    setHttpLogs((prev) => [...prev, log]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message to display
    addDisplayMessage('user', { type: 'text', text });

    // Add user message to chat history
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);

    // Create abort controller
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedHistory,
          model: config.model,
          provider: config.provider,
          api_key: config.apiKey || undefined,
          system_prompt_suffix: config.systemPromptSuffix,
          only_n_most_recent_images: config.onlyNMostRecentImages,
          max_tokens: config.maxTokens,
          tool_version: config.toolVersion,
          thinking_budget: config.thinkingEnabled ? config.thinkingBudget : undefined,
          token_efficient_tools_beta: config.tokenEfficientToolsBeta,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            continue;
          }
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              // Handle different event types based on the data structure
              if ('text' in parsed && parsed.type === 'text') {
                // Message event
                const event = parsed as SSEMessageEvent;
                addDisplayMessage('assistant', { type: 'text', text: event.text });
              } else if ('thinking' in parsed) {
                // Thinking event
                const event = parsed as SSEThinkingEvent;
                addDisplayMessage('assistant', { type: 'thinking', thinking: event.thinking });
              } else if ('name' in parsed && 'input' in parsed) {
                // Tool use event
                const event = parsed as SSEToolUseEvent;
                addDisplayMessage('assistant', {
                  type: 'tool_use',
                  id: event.id,
                  name: event.name,
                  input: event.input,
                });
              } else if ('tool_id' in parsed) {
                // Tool result event
                const event = parsed as SSEToolResultEvent;
                addDisplayMessage('tool', {
                  type: 'tool_result',
                  toolId: event.tool_id,
                  output: event.output,
                  error: event.error,
                  base64Image: event.base64_image,
                });
              } else if ('request' in parsed && 'method' in parsed.request) {
                // HTTP log event
                const event = parsed as SSEHttpLogEvent;
                addHttpLog(event);
              } else if ('error' in parsed && 'type' in parsed) {
                // Error event
                const event = parsed as SSEErrorEvent;
                addDisplayMessage('assistant', { type: 'error', error: event.error });
              } else if ('messages' in parsed) {
                // Done event - update chat history with final messages
                const event = parsed as SSEDoneEvent;
                setChatHistory(event.messages);
              }
            } catch {
              console.error('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        addDisplayMessage('assistant', {
          type: 'text',
          text: '(stopped by user)',
        });
      } else {
        addDisplayMessage('assistant', {
          type: 'error',
          error: (error as Error).message,
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [chatHistory, config, addDisplayMessage, addHttpLog]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setDisplayMessages([]);
    setChatHistory([]);
    setHttpLogs([]);
  }, []);

  return {
    messages: displayMessages,
    httpLogs,
    isStreaming,
    sendMessage,
    stop,
    clearMessages,
  };
}
