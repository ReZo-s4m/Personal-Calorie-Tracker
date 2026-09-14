export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: { url: string; detail?: 'low' | 'high' | 'auto' };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null | (TextContent | ImageContent)[];
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface JsonSchemaSpec {
  name: string;
  schema: Record<string, unknown>;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  tools?: ToolDefinition[];
  jsonSchema?: JsonSchemaSpec;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: string;

  /** Message surfaced to the caller when the provider rejects the request with a 4xx. */
  rejectionMessage?: string;
}

export interface CompletionResult {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface DocumentPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface DocumentRequest {
  parts: DocumentPart[];
  maxTokens?: number;
  rejectionMessage?: string;
}
