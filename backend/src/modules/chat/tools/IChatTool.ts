import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { ChatAction } from '../models/chat.models.js';
import type { PendingAction } from '../pending/pending.models.js';

export interface ToolContext {
  userId: string;
  /** The caller's calendar day, not the server's. */
  today: string;
}

export interface ToolOutcome {
  /** Serialised back to the model as the tool result. */
  result: unknown;
  action?: ChatAction;
  actions?: ChatAction[];
  /** Set when the tool needs the user to choose or confirm before it can finish. */
  pending?: PendingAction;
  download?: { filename: string; buffer: Buffer };
}

/**
 * One capability the assistant can invoke. Each implementation owns its own
 * schema and its own handler, and takes the services it needs through its
 * constructor. ChatTools registers them by name.
 */
export interface IChatTool {
  readonly definition: ToolDefinition;

  handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome>;
}
