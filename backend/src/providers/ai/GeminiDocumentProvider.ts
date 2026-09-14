import type { GeminiConfig } from '../../config/index.js';
import { badRequest, serviceUnavailable } from '../../common/errors.js';
import { GeminiProviderBase } from './GeminiProviderBase.js';
import type { IDocumentProvider } from './IDocumentProvider.js';
import type { DocumentRequest } from './models/chat.models.js';

const REQUEST_TIMEOUT_MS = 60_000;

/** Gemini's native generateContent API, used to read a whole PDF inline. */
export class GeminiDocumentProvider extends GeminiProviderBase implements IDocumentProvider {
  constructor(config: GeminiConfig) {
    super(config);
  }

  async extractJson(request: DocumentRequest): Promise<string> {
    this.ensureConfigured(
      'Deep Analyse is not configured. Set GEMINI_API_KEY to enable it. The script parse still works without it.',
    );

    const last = await this.tryModels(async (model) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${this.config.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: request.parts }],
              generationConfig: {
                temperature: 0,
                responseMimeType: 'application/json',
                maxOutputTokens: request.maxTokens ?? 8_192,
              },
            }),
          },
        );
        const errorText = response.ok ? '' : await response.text();
        return { response, errorText };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw serviceUnavailable('Gemini took too long to read this PDF. Please try again.');
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    });

    if (!last.response.ok) {
      console.error(`Gemini returned ${last.response.status}: ${last.errorText}`);

      if (last.response.status >= 400 && last.response.status < 500) {
        throw badRequest(
          request.rejectionMessage ??
            'Gemini could not read this PDF. It may be corrupt or too large.',
        );
      }

      throw serviceUnavailable('Gemini could not process this request. Try again in a moment.');
    }

    const payload = (await last.response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text =
      payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!stripped) {
      throw serviceUnavailable('Gemini returned an empty reply.');
    }

    return stripped;
  }
}
