import type { ImportMethod } from '../../providers/diary/IDiaryParser.js';
import type { ImportDraftRow } from '../../providers/diary/diary-text.parser.js';
import type { ImportCommitResult, ImportPreview, ImportStatus } from './models/imports.models.js';

export interface IImportsLogic {
  importStatus(): ImportStatus;

  /** Reads the PDF into draft rows. Writes nothing. */
  previewImport(file: Buffer, today: string, method: ImportMethod): Promise<ImportPreview>;

  /** Saves reviewed rows as diary entries, in one transaction. */
  commitImport(userId: string, rows: ImportDraftRow[], today: string): Promise<ImportCommitResult>;
}
