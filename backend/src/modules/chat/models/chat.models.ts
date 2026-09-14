import type { PendingAction } from '../pending/pending.models.js';

export type ChatMutation =
  | 'meal_created'
  | 'meal_updated'
  | 'meal_deleted'
  | 'goals_updated'
  | 'report_ready';

export interface ChatAction {
  tool: string;
  type?: ChatMutation;

  label: string;
  entryId?: string;
  from?: string;
  to?: string;
  filename?: string;
}

export interface ChatDownload {
  filename: string;
  contentType: string;
  base64: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Wire in. */
export interface ChatRequest {
  messages: ChatTurn[];
  today?: string;
  conversationId?: string;
  pendingAction?: unknown;
  choice?: { entryId?: string; index?: number; confirm?: boolean };
}

export interface ChatAttachment {
  buffer: Buffer;
  mimeType: string;
}

/** Wire out. */
export interface ChatReply {
  reply: string;
  actions: ChatAction[];
  conversationId: string;
  pendingAction: PendingAction | null;
  download?: ChatDownload;
}
