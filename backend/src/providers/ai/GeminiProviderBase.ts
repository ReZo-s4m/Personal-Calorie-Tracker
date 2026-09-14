import type { GeminiConfig } from '../../config/index.js';
import { serviceUnavailable } from '../../common/errors.js';
import { shouldTryNextGeminiModel } from './gemini.retry.js';

const CAPACITY_RETRY_MS = 800;

export interface GeminiAttempt {
  response: Response;
  errorText: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Shared plumbing for the Gemini-backed providers: walk the configured model
 * list, stopping at the first that answers or the first failure not worth
 * retrying.
 */
export abstract class GeminiProviderBase {
  protected constructor(protected readonly config: GeminiConfig) {}

  isConfigured(): boolean {
    return this.config.isConfigured;
  }

  protected ensureConfigured(message: string): void {
    if (!this.config.isConfigured) {
      throw serviceUnavailable(message);
    }
  }

  protected async tryModels(
    send: (model: string) => Promise<GeminiAttempt>,
  ): Promise<GeminiAttempt> {
    let last: GeminiAttempt | undefined;

    for (const model of this.config.models) {
      const started = Date.now();
      last = await send(model);
      console.info(`Gemini ${model} ${last.response.status} ${Date.now() - started}ms`);

      if (last.response.ok) {
        if (model !== this.config.model) {
          console.info(`Gemini used fallback model ${model}`);
        }
        return last;
      }

      if (!shouldTryNextGeminiModel(last.response.status, last.errorText)) {
        return last;
      }

      console.warn(
        `Gemini ${model} unavailable (${last.response.status}); trying the next Flash model.`,
      );
      if (last.response.status !== 404) {
        await delay(CAPACITY_RETRY_MS);
      }
    }

    return last ?? { response: new Response(null, { status: 503 }), errorText: '' };
  }
}
