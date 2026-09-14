import { extractText, getDocumentProxy } from 'unpdf';
import { badRequest, unprocessable } from '../../common/errors.js';
import { DiaryParsers } from '../../providers/diary/DiaryParsers.js';
import { MAX_IMPORT_ROWS, type ImportDraftRow } from '../../providers/diary/diary-text.parser.js';
import type { ImportMethod } from '../../providers/diary/IDiaryParser.js';
import type { IEntriesLogic } from '../entries/IEntriesLogic.js';
import type { CreateEntryRequest } from '../entries/models/entries.models.js';
import type { IImportsLogic } from './IImportsLogic.js';
import type { ImportCommitResult, ImportPreview, ImportStatus } from './models/imports.models.js';

export class ImportsLogic implements IImportsLogic {
  constructor(
    private readonly entriesLogic: IEntriesLogic,
    private readonly parsers: DiaryParsers,
  ) {}

  importStatus(): ImportStatus {
    return { deepAnalyseAvailable: this.parsers.isAvailable('gemini') };
  }

  async previewImport(file: Buffer, today: string, method: ImportMethod): Promise<ImportPreview> {
    const extracted = await this.readPdfText(file);
    const parser = this.parsers.forMethod(method);

    const parsed = await parser.parse({
      file,
      text: extracted.text,
      pageCount: extracted.pageCount,
      today,
    });

    return {
      method: parser.method,
      rows: parsed.rows,
      warnings: parsed.warnings,
      notes: parsed.notes,
      headerGuess: parsed.headerGuess,
      schema: parsed.schema,
      pageCount: extracted.pageCount,
      deepAnalyseAvailable: this.parsers.isAvailable('gemini'),
    };
  }

  async commitImport(
    userId: string,
    rows: ImportDraftRow[],
    today: string,
  ): Promise<ImportCommitResult> {
    if (rows.length === 0) {
      throw badRequest('There is nothing to save. Add a row, or parse a PDF first.');
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throw badRequest(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
    }

    const inputs = rows.map((row) => this.toCreateRequest(row, today));
    const created = await this.entriesLogic.createEntries(userId, inputs, 'pdf');

    return { imported: created.length };
  }

  private async readPdfText(file: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(file));
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      const joined = Array.isArray(text) ? text.join('\n') : text;

      return { text: joined, pageCount: totalPages };
    } catch {
      throw unprocessable(
        'This file could not be read as a PDF. It may be corrupt, password-protected, or not a PDF at all.',
      );
    }
  }

  private toCreateRequest(row: ImportDraftRow, today: string): CreateEntryRequest {
    const consumedOn = row.consumedOn || today;

    return {
      foodName: row.foodName.trim(),
      mealType: row.mealType,
      quantity: row.quantity,
      unit: row.unit,
      calories: row.calories,
      proteinGrams: row.proteinGrams,
      carbGrams: row.carbGrams,
      fatGrams: row.fatGrams,
      consumedOn,
      consumedAt: row.consumedAt ? new Date(row.consumedAt) : new Date(`${consumedOn}T12:00:00.000Z`),
    };
  }
}
