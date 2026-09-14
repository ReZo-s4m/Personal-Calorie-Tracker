import { MEAL_TYPES, type MealType } from '../../common/nutrition.js';
import { unprocessable } from '../../common/errors.js';
import type { IDocumentProvider } from '../ai/IDocumentProvider.js';
import { MAX_IMPORT_ROWS, type ImportDraftRow } from './diary-text.parser.js';
import type {
  DiaryParseInput,
  DiaryParseResult,
  IDiaryParser,
  ImportMethod,
} from './IDiaryParser.js';

const MAX_EXTRACTED_CHARS = 40_000;
const MAX_GEMINI_TOKENS = 8_192;

/** Deep Analyse: hands the whole PDF to the model when the table parser cannot map it. */
export class GeminiDiaryParser implements IDiaryParser {
  readonly method: ImportMethod = 'gemini';

  constructor(private readonly documents: IDocumentProvider) {}

  isAvailable(): boolean {
    return this.documents.isConfigured();
  }

  async parse(input: DiaryParseInput): Promise<DiaryParseResult> {
    const raw = await this.documents.extractJson({
      maxTokens: MAX_GEMINI_TOKENS,
      rejectionMessage:
        'Gemini could not read this PDF. It may be corrupt, too large, or in a format the model does not support.',
      parts: [
        { inline_data: { mime_type: 'application/pdf', data: input.file.toString('base64') } },
        { text: this.buildPrompt(input) },
      ],
    });

    let parsed: { rows?: unknown; notes?: unknown; warnings?: unknown };

    try {
      parsed = JSON.parse(raw) as { rows?: unknown; notes?: unknown; warnings?: unknown };
    } catch {
      throw unprocessable('Gemini returned a reply that was not valid JSON. Try Deep Analyse again.');
    }

    const rows = Array.isArray(parsed.rows)
      ? parsed.rows
          .map((row) => this.sanitiseRow(row, input.today))
          .filter((row): row is ImportDraftRow => row !== null)
          .slice(0, MAX_IMPORT_ROWS)
      : [];

    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [];

    if (rows.length === 0 && warnings.length === 0) {
      warnings.push('Gemini did not find any meals in this PDF.');
    }

    return {
      rows,
      warnings,
      notes: typeof parsed.notes === 'string' ? parsed.notes : `Read ${rows.length} rows with Gemini.`,
      headerGuess: null,
      schema: 'gemini',
    };
  }

  private buildPrompt(input: DiaryParseInput): string {
    const excerpt =
      input.text.trim().length > 0
        ? input.text.slice(0, MAX_EXTRACTED_CHARS)
        : '(no selectable text — the file is likely a scan)';

    return `You are reading a personal food diary exported as a PDF. Today is ${input.today}.

Extract every food or drink the person ate. Ignore titles, page numbers, goals, totals, charts and advice.

Return a JSON object: { "rows": [...], "notes": string|null, "warnings": string[] }

Each row:
- foodName (string, required)
- mealType: one of ${MEAL_TYPES.join(', ')}. Infer from the food, a heading, or the time when unsaid.
- quantity (number > 0, default 1)
- unit (string, default "serving")
- calories (number >= 0). Estimate from the food and portion when the PDF has no number. Never leave this null.
- proteinGrams, carbGrams, fatGrams (numbers >= 0, default 0)
- consumedOn (YYYY-MM-DD). Use dates written in the PDF; resolve "today"/"yesterday" against ${input.today}; if a row has no date, use ${input.today}.
- consumedAt (optional ISO date-time) only when a clock time is written.

Do not invent meals that are not in the document. If nothing looks like a diary, return { "rows": [], "notes": null, "warnings": ["No food entries found."] }.

Selectable text already extracted from the file, which may help when the layout is a table:

${excerpt}`;
  }

  private sanitiseRow(value: unknown, today: string): ImportDraftRow | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = value as Record<string, unknown>;
    const foodName = typeof row.foodName === 'string' ? row.foodName.trim() : '';
    const calories = this.parseAmount(row.calories);

    if (!foodName || calories === undefined) {
      return null;
    }

    const mealType = MEAL_TYPES.includes(row.mealType as MealType)
      ? (row.mealType as MealType)
      : 'snack';

    const consumedOn =
      typeof row.consumedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.consumedOn)
        ? row.consumedOn
        : today;

    const quantity = this.parseAmount(row.quantity);
    const draft: ImportDraftRow = {
      foodName: foodName.slice(0, 160),
      mealType,
      quantity: quantity && quantity > 0 ? Math.min(quantity, 10_000) : 1,
      unit:
        typeof row.unit === 'string' && row.unit.trim() ? row.unit.trim().slice(0, 24) : 'serving',
      calories: Math.min(Math.max(calories, 0), 100_000),
      proteinGrams: this.clampAmount(this.parseAmount(row.proteinGrams) ?? 0),
      carbGrams: this.clampAmount(this.parseAmount(row.carbGrams) ?? 0),
      fatGrams: this.clampAmount(this.parseAmount(row.fatGrams) ?? 0),
      consumedOn,
    };

    if (typeof row.consumedAt === 'string' && !Number.isNaN(Date.parse(row.consumedAt))) {
      draft.consumedAt = new Date(row.consumedAt).toISOString();
    }

    return draft;
  }

  private parseAmount(value: unknown): number | undefined {
    const parsed =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private clampAmount(value: number): number {
    return Math.min(Math.max(value, 0), 100_000);
  }
}
