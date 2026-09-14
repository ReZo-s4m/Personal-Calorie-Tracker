import type { GeminiConfig } from '../../config/index.js';
import { badRequest, serviceUnavailable } from '../../common/errors.js';
import { GeminiProviderBase } from './GeminiProviderBase.js';
import type { IChatProvider } from './IChatProvider.js';
import type {
  ChatCompletionRequest,
  ChatMessage,
  CompletionResult,
} from './models/chat.models.js';

const CHAT_TIMEOUT_MS = 20_000;

/** Gemini behind its OpenAI-compatible endpoint. Drives Ask AI. */
export class GeminiChatProvider extends GeminiProviderBase implements IChatProvider {
  constructor(config: GeminiConfig) {
    super(config);
  }

  async complete(request: ChatCompletionRequest): Promise<CompletionResult> {
    this.ensureConfigured('Chat is not configured. Set GEMINI_API_KEY to enable the assistant.');

    const messages = this.withSchemaInstruction(request);

    const last = await this.tryModels(async (model) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs(request));

      try {
        const response = await fetch(`${this.config.baseUrl}/openai/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: request.temperature ?? 0.5,
            reasoning_effort: 'minimal',
            ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
            ...(request.tools ? { tools: request.tools } : {}),
            ...(request.jsonSchema ? { response_format: { type: 'json_object' } } : {}),
          }),
        });
        const errorText = response.ok ? '' : await response.text();
        return { response, errorText };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw serviceUnavailable('The chat service took too long to respond. Please try again.');
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    });

    if (!last.response.ok) {
      console.error(`Gemini chat returned ${last.response.status}: ${last.errorText}`);

      if (last.response.status >= 400 && last.response.status < 500) {
        throw badRequest(
          request.rejectionMessage ?? 'The chat service could not process this request.',
        );
      }

      throw serviceUnavailable('The chat service is busy. Please try again in a moment.');
    }

    const payload = (await last.response.json()) as {
      choices?: {
        message?: { content?: string | null; tool_calls?: CompletionResult['toolCalls'] };
      }[];
    };

    const message = payload.choices?.[0]?.message;

    if (!message) {
      throw serviceUnavailable('The chat service returned an empty response.');
    }

    const content = message.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim() ?? null;

    return { content, toolCalls: message.tool_calls ?? [] };
  }

  private timeoutMs(request: ChatCompletionRequest): number {
    const hasImage = request.messages.some(
      (message) =>
        Array.isArray(message.content) &&
        message.content.some((part) => part.type === 'image_url'),
    );
    return hasImage ? 45_000 : CHAT_TIMEOUT_MS;
  }

  private withSchemaInstruction(request: ChatCompletionRequest): ChatMessage[] {
    if (!request.jsonSchema) {
      return request.messages;
    }

    return [
      ...request.messages,
      {
        role: 'system' as const,
        content: `Reply with a single JSON object and nothing else. It must match this JSON schema:\n${JSON.stringify(
          request.jsonSchema.schema,
        )}`,
      },
    ];
  }
}
