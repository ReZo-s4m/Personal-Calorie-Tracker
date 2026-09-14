import type { ImportMethod } from '../../../providers/diary/IDiaryParser.js';
import type { ImportDraftRow } from '../../../providers/diary/diary-text.parser.js';

export type { ImportDraftRow, ImportMethod };

/** Wire out: is Deep Dive configured on this server. */
export interface ImportStatus {
  deepAnalyseAvailable: boolean;
}

/** Wire out: the reviewable table, nothing saved yet. */
export interface ImportPreview {
  method: ImportMethod;
  rows: ImportDraftRow[];
  warnings: string[];
  notes: string | null;
  headerGuess: string[] | null;
  schema: string | null;
  pageCount: number;
  deepAnalyseAvailable: boolean;
}

export interface ImportCommitResult {
  imported: number;
}
