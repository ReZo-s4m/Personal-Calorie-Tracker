import { toDateKey } from '../../common/dates.js';
import type { IChatProvider, ChatMessage } from '../../providers/ai/index.js';
import type { IAuthLogic } from '../auth/IAuthLogic.js';
import { AttachmentsLogic } from './attachments/AttachmentsLogic.js';
import type { IChatLogic } from './IChatLogic.js';
import type {
  ChatAction,
  ChatAttachment,
  ChatDownload,
  ChatReply,
  ChatRequest,
} from './models/chat.models.js';
import {
  describePending,
  isAttachPending,
  isPendingExpired,
  looksLikePendingReply,
} from './pending/pending.factory.js';
import type { PendingAction, PendingChoice } from './pending/pending.models.js';
import { PendingLogic } from './pending/PendingLogic.js';
import type { ChatTools } from './tools/ChatTools.js';
import type { ToolContext, ToolOutcome } from './tools/IChatTool.js';
import { firstNameOf } from '../../common/display-name.js';
import { buildChatSystemPrompt } from './chat.prompt.js';

const MAX_TOOL_ROUNDS = 5;
const MAX_TOOL_CALLS = 8;
const MAX_REPLY_TOKENS = 800;
const TEMPERATURE = 0.5;

const FALLBACK_REPLY = "I couldn't put together an answer for that. Try rephrasing it.";
const REJECTION_MESSAGE = "I couldn't act on that. Try rephrasing it, or say it in smaller steps.";

/** The write agent. Runs a bounded tool loop and owns the pending-question dance. */
export class ChatLogic implements IChatLogic {
  constructor(
    private readonly chatProvider: IChatProvider,
    private readonly tools: ChatTools,
    private readonly pendingLogic: PendingLogic,
    private readonly attachmentsLogic: AttachmentsLogic,
    private readonly authLogic: IAuthLogic,
  ) {}

  async respond(
    userId: string,
    input: ChatRequest,
    attachment?: ChatAttachment,
  ): Promise<ChatReply> {
    const conversationId = input.conversationId?.trim() || crypto.randomUUID();
    const started = Date.now();
    const actions: ChatAction[] = [];
    const profile = await this.authLogic.getProfile(userId);
    const firstName = firstNameOf(profile.displayName);

    try {
      const reply = await this.runTurn(userId, input, actions, conversationId, firstName, attachment);
      this.logTurn(conversationId, actions, reply.pendingAction, Date.now() - started);
      return reply;
    } catch (error) {
      if (actions.length === 0) {
        throw error;
      }

      const reply = {
        reply: this.describeActions(actions),
        actions,
        conversationId,
        pendingAction: null,
      };
      this.logTurn(conversationId, actions, null, Date.now() - started, 'partial');
      return reply;
    }
  }

  private async runTurn(
    userId: string,
    input: ChatRequest,
    actions: ChatAction[],
    conversationId: string,
    firstName: string,
    attachment?: ChatAttachment,
  ): Promise<ChatReply> {
    const context: ToolContext = { userId, today: input.today ?? toDateKey(new Date()) };
    const lastUser =
      [...input.messages].reverse().find((turn) => turn.role === 'user')?.content ?? '';
    const pending = this.parsePendingAction(input.pendingAction);
    let download: ChatDownload | undefined;

    if (attachment) {
      const previewed = await this.attachmentsLogic.previewAttachment(
        attachment.buffer,
        attachment.mimeType,
        context.today,
      );
      return {
        reply: previewed.reply,
        actions: [],
        conversationId,
        pendingAction: previewed.pendingAction,
      };
    }

    if (pending && !isPendingExpired(pending) && isAttachPending(pending)) {
      const resolved = await this.attachmentsLogic.applyAttachPending(
        userId,
        pending,
        lastUser,
        context.today,
        input.choice as PendingChoice | undefined,
      );

      if (!resolved.unhandled) {
        actions.push(...resolved.actions);
        return {
          reply: resolved.reply,
          actions: resolved.actions,
          conversationId,
          pendingAction: resolved.pendingAction,
        };
      }

      const interpreted = await this.attachmentsLogic.interpretAttachMessage(
        pending,
        lastUser,
        context.today,
        userId,
      );
      if (!interpreted.unhandled) {
        actions.push(...interpreted.actions);
        return {
          reply: interpreted.reply,
          actions: interpreted.actions,
          conversationId,
          pendingAction: interpreted.pendingAction,
        };
      }

      const aside = await this.answerAside(input.messages, firstName, context.today);
      return {
        reply: `${aside}\n\nThe draft is still open — say what to change, or tell me to log it.`,
        actions: [],
        conversationId,
        pendingAction: pending,
      };
    }

    if (
      pending &&
      !isPendingExpired(pending) &&
      (input.choice || looksLikePendingReply(lastUser, pending))
    ) {
      const resolved = await this.pendingLogic.applyPending(
        userId,
        pending,
        lastUser,
        input.choice as PendingChoice | undefined,
      );
      actions.push(...resolved.actions);
      return {
        reply: resolved.reply,
        actions: resolved.actions,
        conversationId,
        pendingAction: resolved.pendingAction,
      };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildChatSystemPrompt(context.today, firstName) },
      ...input.messages.map((turn) => ({ role: turn.role, content: turn.content })),
    ];

    let callsMade = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await this.chatProvider.complete({
        messages,
        tools: this.tools.definitions(),
        temperature: TEMPERATURE,
        maxTokens: MAX_REPLY_TOKENS,
        rejectionMessage: REJECTION_MESSAGE,
      });

      if (completion.toolCalls.length === 0) {
        return {
          reply: this.orFallback(completion.content),
          actions,
          conversationId,
          pendingAction: null,
          download,
        };
      }

      messages.push({
        role: 'assistant',
        content: completion.content,
        tool_calls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        const outcome: ToolOutcome =
          callsMade >= MAX_TOOL_CALLS
            ? { result: { error: 'Too many actions in one turn. Answer with what you have.' } }
            : await this.tools.run(call.function.name, call.function.arguments, context);

        callsMade += 1;

        if (outcome.actions?.length) {
          actions.push(...outcome.actions);
        } else if (outcome.action) {
          actions.push(outcome.action);
        }

        if (outcome.download) {
          download = {
            filename: outcome.download.filename,
            contentType: 'application/pdf',
            base64: outcome.download.buffer.toString('base64'),
          };
        }

        if (outcome.pending) {
          return {
            reply: describePending(outcome.pending),
            actions,
            conversationId,
            pendingAction: outcome.pending,
            download,
          };
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(outcome.result),
        });
      }
    }

    return {
      reply: await this.forceAnswer(messages),
      actions,
      conversationId,
      pendingAction: null,
      download,
    };
  }

  private async forceAnswer(messages: ChatMessage[]): Promise<string> {
    const completion = await this.chatProvider.complete({
      messages: [
        ...messages,
        {
          role: 'system',
          content:
            'Answer the user now, in plain prose, using only what the tools have already returned.',
        },
      ],
      temperature: TEMPERATURE,
      maxTokens: MAX_REPLY_TOKENS,
      rejectionMessage: REJECTION_MESSAGE,
    });

    return this.orFallback(completion.content);
  }

  private async answerAside(
    messages: ChatRequest['messages'],
    firstName: string,
    today: string,
  ): Promise<string> {
    const completion = await this.chatProvider.complete({
      messages: [
        {
          role: 'system',
          content: `${buildChatSystemPrompt(today, firstName)}\n\nA photo or PDF draft is open. Answer this side question only. Do not say you logged, changed or imported anything.`,
        },
        ...messages.map((turn) => ({ role: turn.role, content: turn.content })),
      ],
      temperature: TEMPERATURE,
      maxTokens: MAX_REPLY_TOKENS,
      rejectionMessage: REJECTION_MESSAGE,
    });

    return this.orFallback(completion.content);
  }

  private orFallback(content: string | null): string {
    return content?.trim() || FALLBACK_REPLY;
  }

  private describeActions(actions: ChatAction[]): string {
    const done = actions.map((action) => action.label).join('. ');

    return `${done}. The assistant could not finish its reply because the AI service is busy, but those changes were saved.`;
  }

  private parsePendingAction(value: unknown): PendingAction | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const pending = value as PendingAction;
    if (!pending.kind || !pending.expiresAt) {
      return null;
    }

    if (!Array.isArray(pending.candidates)) {
      pending.candidates = [];
    }

    return pending;
  }

  private logTurn(
    conversationId: string,
    actions: ChatAction[],
    pending: PendingAction | null,
    ms: number,
    status = 'ok',
  ): void {
    console.info(
      JSON.stringify({
        event: 'chat.turn',
        conversationId,
        status,
        tools: actions.map((action) => action.tool),
        pending: pending?.kind ?? null,
        ms,
      }),
    );
  }
}
