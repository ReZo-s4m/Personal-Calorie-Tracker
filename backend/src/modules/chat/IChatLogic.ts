import type { ChatAttachment, ChatReply, ChatRequest } from './models/chat.models.js';

export interface IChatLogic {
  /** One turn. May write the diary through tools, or leave a question pending. */
  respond(userId: string, input: ChatRequest, attachment?: ChatAttachment): Promise<ChatReply>;
}
