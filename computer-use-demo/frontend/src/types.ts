// API Types matching backend models

export type Provider = 'anthropic' | 'bedrock' | 'vertex';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'image';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
  is_error?: boolean;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  api_key?: string;
  system_prompt_suffix: string;
  only_n_most_recent_images: number;
  max_tokens: number;
  tool_version: string;
  thinking_budget?: number;
  token_efficient_tools_beta: boolean;
}

export interface AuthValidateRequest {
  provider: Provider;
  api_key?: string;
}

export interface AuthValidateResponse {
  valid: boolean;
  error?: string;
}

export interface ApiKeyResponse {
  has_key: boolean;
  masked_key: string | null;
}

export interface ModelConfig {
  tool_version: string;
  max_output_tokens: number;
  default_output_tokens: number;
  has_thinking: boolean;
}

export interface ConfigResponse {
  providers: string[];
  default_models: Record<string, string>;
  tool_versions: string[];
  model_configs: Record<string, ModelConfig>;
}

// SSE Event types
export type SSEEventType = 'message' | 'tool_use' | 'tool_result' | 'thinking' | 'error' | 'done' | 'http_log';

export interface SSEMessageEvent {
  type: 'text';
  text: string;
}

export interface SSEThinkingEvent {
  thinking: string;
}

export interface SSEToolUseEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface SSEToolResultEvent {
  tool_id: string;
  output?: string;
  error?: string;
  base64_image?: string;
  system?: string;
}

export interface SSEHttpLogEvent {
  request: {
    method: string;
    url: string;
    body?: Record<string, unknown>;
  };
  response?: {
    status_code: number;
  };
  error?: string;
}

export interface SSEErrorEvent {
  error: string;
  type: string;
}

export interface SSEDoneEvent {
  messages: ChatMessage[];
}

// UI State types
export interface AppConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  systemPromptSuffix: string;
  onlyNMostRecentImages: number;
  maxTokens: number;
  toolVersion: string;
  thinkingEnabled: boolean;
  thinkingBudget: number;
  hideImages: boolean;
  tokenEfficientToolsBeta: boolean;
}

export interface HttpLogEntry {
  id: string;
  timestamp: Date;
  request: {
    method: string;
    url: string;
    body?: Record<string, unknown>;
  };
  response?: {
    status_code: number;
  };
  error?: string;
}

// Display types for chat UI
export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: DisplayContent;
  timestamp: Date;
}

export type DisplayContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolId: string; output?: string; error?: string; base64Image?: string }
  | { type: 'error'; error: string };
