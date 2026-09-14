import type { ImportDraftRow } from './diary-text.parser.js';

export type ImportMethod = 'script' | 'gemini';

/** What both parsers are handed: the raw file plus whatever text could be lifted from it. */
export interface DiaryParseInput {
  file: Buffer;
  text: string;
  pageCount: number;
  today: string;
}

export interface DiaryParseResult {
  rows: ImportDraftRow[];
  warnings: string[];
  notes: string | null;
  headerGuess: string[] | null;
  schema: string | null;
}

/**
 * Reads a food diary into draft rows. Two implementations, chosen at request
 * time by the `mode` field: a local table parser and a Gemini deep read.
 * The registry in DiaryParsers.ts does the picking, the way EntityProviders
 * does in profile_service.
 */
export interface IDiaryParser {
  readonly method: ImportMethod;

  isAvailable(): boolean;

  parse(input: DiaryParseInput): Promise<DiaryParseResult>;
}
