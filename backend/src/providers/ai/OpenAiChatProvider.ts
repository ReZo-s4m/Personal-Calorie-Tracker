import type { AiConfig } from '../../config/index.js';
import { badRequest, serviceUnavailable } from '../../common/errors.js';
import { AiResponseError } from './ai-response-error.js';
import type { IChatProvider } from './IChatProvider.js';
import type {
  ChatCompletionRequest,
  ChatMessage,
  CompletionResult,
  JsonSchemaSpec,
  ToolCall,
} from './models/chat.models.js';

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRY_WAIT_MS = 6_000;

interface Attempt {
  response: Response;
  errorText: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** OpenAI-compatible chat completions. Reads the plate and label photos. */
export class OpenAiChatProvider implements IChatProvider {
  constructor(private readonly config: AiConfig) {}

  isConfigured(): boolean {
    return this.config.isConfigured;
  }

  async complete(request: ChatCompletionRequest): Promise<CompletionResult> {
    this.ensureConfigured();

    const body = JSON.stringify({
      model: request.model ?? this.config.model,
      messages: this.withSchemaInstruction(request),
      temperature: request.temperature ?? 0.1,
      ...(request.maxTokens ? { max_completion_tokens: request.maxTokens } : {}),
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.reasoningEffort ? { reasoning_effort: request.reasoningEffort } : {}),
      ...this.responseFormat(request.jsonSchema),
    });

    let attempt = await this.post(body);

    if (this.shouldRetry(attempt)) {
      await delay(this.rateLimitWait(attempt.response) ?? 0);
      attempt = await this.post(body);
    }

    const { response, errorText } = attempt;

    if (!response.ok) {
      console.error(`AI provider returned ${response.status}: ${errorText}`);

      if (response.status === 429) {
        const seconds = Math.ceil((this.rateLimitWait(response) ?? 0) / 1_000);

        throw serviceUnavailable(
          seconds > 0
            ? `The AI service is rate limited. Try again in about ${seconds} second${seconds === 1 ? '' : 's'}.`
            : 'The AI service is rate limited right now. Please try again in a moment.',
        );
      }

      if (response.status >= 400 && response.status < 500) {
        throw badRequest(
          request.rejectionMessage ?? 'The AI service could not process this request.',
        );
      }

      throw serviceUnavailable('The AI service could not process this request.');
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
    };

    const message = payload.choices?.[0]?.message;

    if (!message) {
      throw new AiResponseError('The AI service returned an empty response.');
    }

    return {
      content: this.stripReasoning(message.content ?? null),
      toolCalls: message.tool_calls ?? [],
    };
  }

  private ensureConfigured(): void {
    if (!this.config.isConfigured) {
      throw serviceUnavailable(
        'AI features are not configured on this server. Set AI_API_KEY to enable them.',
      );
    }
  }

  private async post(body: string): Promise<Attempt> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body,
      });

      return { response, errorText: response.ok ? '' : await response.text() };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw serviceUnavailable('The AI service took too long to respond. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private responseFormat(jsonSchema: JsonSchemaSpec | undefined) {
    if (!jsonSchema) {
      return {};
    }

    if (this.config.jsonMode === 'object') {
      return { response_format: { type: 'json_object' } };
    }

    return {
      response_format: {
        type: 'json_schema',
        json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
      },
    };
  }

  private withSchemaInstruction(request: ChatCompletionRequest): ChatMessage[] {
    if (this.config.jsonMode !== 'object' || !request.jsonSchema) {
      return request.messages;
    }

    return [
      ...request.messages,
      {
        role: 'system',
        content: `Reply with a single JSON object and nothing else. It must match this JSON schema:\n${JSON.stringify(
          request.jsonSchema.schema,
        )}`,
      },
    ];
  }

  private stripReasoning(content: string | null): string | null {
    if (!content) {
      return content;
    }

    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  private rateLimitWait(response: Response): number | null {
    if (response.status !== 429) {
      return null;
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    return Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter * 1_000) : null;
  }

  private shouldRetry({ response, errorText }: Attempt): boolean {
    const wait = this.rateLimitWait(response);

    if (wait !== null) {
      return wait <= MAX_RETRY_WAIT_MS;
    }

    return response.status === 400 && errorText.includes('tool_use_failed');
  }
}
