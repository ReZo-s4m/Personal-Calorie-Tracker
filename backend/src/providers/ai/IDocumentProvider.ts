import type { DocumentRequest } from './models/chat.models.js';

/**
 * A model that reads a whole document (a PDF sent inline) and returns JSON text.
 *
 * Separate from IChatProvider because the wire format is the native generateContent
 * API rather than a chat transcript.
 */
export interface IDocumentProvider {
  isConfigured(): boolean;

  /** Returns the raw JSON text of the reply, fences already stripped. */
  extractJson(request: DocumentRequest): Promise<string>;
}
