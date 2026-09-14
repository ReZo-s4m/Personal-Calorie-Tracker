import type { ChatCompletionRequest, CompletionResult } from './models/chat.models.js';

/**
 * A model that answers a transcript, optionally calling tools.
 *
 * Two implementations exist: OpenAiChatProvider reads images for photo extract,
 * GeminiChatProvider drives Ask AI. Both are selected by the
 * composition root, never by the services that use them.
 */
export interface IChatProvider {
  isConfigured(): boolean;

  complete(request: ChatCompletionRequest): Promise<CompletionResult>;
}
