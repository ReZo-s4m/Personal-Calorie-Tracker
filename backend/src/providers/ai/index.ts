import { config } from '../../config/index.js';
import { GeminiChatProvider } from './GeminiChatProvider.js';
import { GeminiDocumentProvider } from './GeminiDocumentProvider.js';
import type { IChatProvider } from './IChatProvider.js';
import type { IDocumentProvider } from './IDocumentProvider.js';
import { OpenAiChatProvider } from './OpenAiChatProvider.js';

export type { IChatProvider } from './IChatProvider.js';
export type { IDocumentProvider } from './IDocumentProvider.js';
export * from './models/chat.models.js';
export { AiResponseError, parseJsonContent } from './ai-response-error.js';
export { shouldTryNextGeminiModel } from './gemini.retry.js';

/** Ask AI. */
export const geminiChatProvider: IChatProvider = new GeminiChatProvider(config.gemini);

/** Photo extract: Gemini when that key is set, otherwise OpenAI. */
export const visionChatProvider: IChatProvider = config.gemini.isConfigured
  ? geminiChatProvider
  : new OpenAiChatProvider(config.ai);

/** Deep Analyse: reads a whole PDF diary. */
export const geminiDocumentProvider: IDocumentProvider = new GeminiDocumentProvider(config.gemini);
