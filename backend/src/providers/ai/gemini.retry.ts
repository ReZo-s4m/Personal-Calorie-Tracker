/**
 * Whether a failed Gemini call is worth retrying against the next model in the
 * fallback list. Capacity problems and retired models are; a malformed request
 * is not.
 */
export function shouldTryNextGeminiModel(status: number, body: string): boolean {
  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    /high demand|UNAVAILABLE|overloaded|no longer available|NOT_FOUND/i.test(body)
  );
}
