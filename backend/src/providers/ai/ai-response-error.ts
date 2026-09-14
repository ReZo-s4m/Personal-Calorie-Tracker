/** The provider answered, but not with something we can use. */
export class AiResponseError extends Error {}

export function parseJsonContent<T>(content: string | null): T {
  if (!content) {
    throw new AiResponseError('The AI service returned no content to parse.');
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new AiResponseError('The AI service returned malformed JSON.');
  }
}
