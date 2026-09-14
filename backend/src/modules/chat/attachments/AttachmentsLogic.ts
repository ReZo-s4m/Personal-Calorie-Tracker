import { MEAL_TYPES } from '../../../common/nutrition.js';
import { badRequest } from '../../../common/errors.js';
import { parseJsonContent, type IChatProvider } from '../../../providers/ai/index.js';
import type { ImportDraftRow } from '../../../providers/diary/diary-text.parser.js';
import type { IExtractLogic } from '../../ai/IExtractLogic.js';
import type { ExtractionResult } from '../../ai/models/extraction.models.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';
import type { IImportsLogic } from '../../imports/IImportsLogic.js';
import type { ChatAction } from '../models/chat.models.js';
import { createPending } from '../pending/pending.factory.js';
import type { PendingAction, PendingOutcome } from '../pending/pending.models.js';
import {
  COLUMNS,
  applyField,
  editExtraction,
  editImportRows,
  formatExtraction,
  formatImportTable,
} from './format.js';

const LOG_IT =
  /\b(log (it|them|this|these)|import (it|them|this|these)|save (it|them|this|these)|looks good|that'?s fine|go ahead|confirm|yes,? log)\b/i;
const CANCEL = /^(no|n|cancel|stop|forget it|don't)$/i;


interface InterpretedAttach {
  action?: string;
  question?: string;
  foodName?: string | null;
  mealType?: string | null;
  quantity?: number | null;
  unit?: string | null;
  calories?: number | null;
  proteinGrams?: number | null;
  carbGrams?: number | null;
  fatGrams?: number | null;
  edits?: { row?: number; field?: string; value?: string | number }[];
}

const INTERPRET_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['confirm', 'cancel', 'edit', 'ask', 'other'] },
    question: { type: 'string' },
    foodName: { type: ['string', 'null'] },
    mealType: { type: ['string', 'null'] },
    quantity: { type: ['number', 'null'] },
    unit: { type: ['string', 'null'] },
    calories: { type: ['number', 'null'] },
    proteinGrams: { type: ['number', 'null'] },
    carbGrams: { type: ['number', 'null'] },
    fatGrams: { type: ['number', 'null'] },
    edits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          row: { type: 'integer' },
          field: { type: 'string' },
          value: { type: ['string', 'number'] },
        },
        required: ['row', 'field', 'value'],
      },
    },
  },
  required: [
    'action',
    'question',
    'foodName',
    'mealType',
    'quantity',
    'unit',
    'calories',
    'proteinGrams',
    'carbGrams',
    'fatGrams',
    'edits',
  ],
};


/** Owns the photo and PDF drafts: preview, edit in plain language, then commit. */
export class AttachmentsLogic {
  constructor(
    private readonly extractLogic: IExtractLogic,
    private readonly importsLogic: IImportsLogic,
    private readonly entriesLogic: IEntriesLogic,
    private readonly chatProvider: IChatProvider,
  ) {}

  async previewAttachment(
    file: Buffer,
    mimeType: string,
    today: string,
  ): Promise<{ reply: string; pendingAction: PendingAction }> {
    if (mimeType === 'application/pdf') {
      let preview = await this.importsLogic.previewImport(file, today, 'script');

      if (preview.rows.length === 0 && this.importsLogic.importStatus().deepAnalyseAvailable) {
        preview = await this.importsLogic.previewImport(file, today, 'gemini');
      }

      if (preview.rows.length === 0) {
        throw badRequest(
          preview.notes ||
            'I could not read any diary rows from that PDF. Try the Bulk import page if you want a deep analyse.',
        );
      }

      const pending = createPending('review_import', 'pdf import', []);
      pending.importRows = preview.rows;

      const extra = preview.warnings.length > 0 ? `\n\n${preview.warnings.slice(0, 3).join('\n')}` : '';
      const how = preview.method === 'gemini' ? ' after a deeper read' : '';

      return {
        reply: `I read ${preview.rows.length} ${preview.rows.length === 1 ? 'row' : 'rows'} from the PDF${how}. Nothing is saved yet.\n\n${formatImportTable(preview.rows)}\n\nTell me a row and column to change, or say when to log these.${extra}`,
        pendingAction: pending,
      };
    }

    if (!mimeType.startsWith('image/')) {
      throw badRequest('Attach a photo (JPEG, PNG or WebP) or a PDF diary.');
    }

    const extraction = await this.extractLogic.extractNutritionFromImage(file, mimeType);
    const pending = createPending('confirm_extract', 'photo extract', []);
    pending.extract = extraction;

    return {
      reply: `${formatExtraction(extraction)}\n\nTell me what to change, or say when to log it.`,
      pendingAction: pending,
    };
  }

  async applyAttachPending(
    userId: string,
    pending: PendingAction,
    text: string,
    today: string,
    choice?: { confirm?: boolean },
  ): Promise<PendingOutcome & { unhandled?: boolean }> {
    if (CANCEL.test(text.trim()) || choice?.confirm === false) {
      return { reply: 'Okay, I discarded that draft. Nothing was saved.', actions: [], pendingAction: null };
    }

    if (pending.kind === 'confirm_extract' && pending.extract) {
      return this.applyExtractPending(userId, pending, text, today, choice);
    }

    if (pending.kind === 'review_import' && pending.importRows) {
      return this.applyImportPending(userId, pending, text, today, choice);
    }

    return { reply: '', actions: [], pendingAction: pending, unhandled: true };
  }

  private async applyExtractPending(
    userId: string,
    pending: PendingAction,
    text: string,
    today: string,
    choice?: { confirm?: boolean },
  ): Promise<PendingOutcome & { unhandled?: boolean }> {
    const extraction = pending.extract!;

    if (choice?.confirm === true || LOG_IT.test(text) || /^(yes|y|ok|okay)$/i.test(text.trim())) {
      const mealType = extraction.suggestedMealType ?? 'lunch';
      const entry = await this.entriesLogic.createEntry(
        userId,
        {
          foodName: extraction.entry.foodName,
          mealType,
          quantity: extraction.entry.quantity,
          unit: extraction.entry.unit,
          calories: extraction.entry.calories,
          proteinGrams: extraction.entry.proteinGrams,
          carbGrams: extraction.entry.carbGrams,
          fatGrams: extraction.entry.fatGrams,
          consumedOn: today,
          micronutrients: extraction.entry.micronutrients.map((item) => ({
            nutrient: item.nutrient,
            amount: item.amount,
            unit: item.unit,
          })),
        },
        'image',
      );

      return {
        reply: `Logged ${entry.foodName} as ${entry.mealType} — ${Math.round(entry.calories)} kcal. It is on Today now.`,
        actions: [
          {
            tool: 'log_meal',
            type: 'meal_created',
            label: `Logged ${entry.foodName} from a photo — ${Math.round(entry.calories)} kcal`,
            entryId: entry.id,
          },
        ],
        pendingAction: null,
      };
    }

    const edited = editExtraction(extraction, text);
    if (!edited) {
      return { reply: '', actions: [], pendingAction: pending, unhandled: true };
    }

    const next = createPending('confirm_extract', pending.originalRequest, []);
    next.extract = edited;

    return {
      reply: `Updated draft:\n\n${formatExtraction(edited)}\n\nAnything else, or shall I log it?`,
      actions: [],
      pendingAction: next,
    };
  }

  private async applyImportPending(
    userId: string,
    pending: PendingAction,
    text: string,
    today: string,
    choice?: { confirm?: boolean },
  ): Promise<PendingOutcome & { unhandled?: boolean }> {
    const rows = pending.importRows ?? [];

    if (choice?.confirm === true || LOG_IT.test(text) || /^(yes|y|ok|okay)$/i.test(text.trim())) {
      const result = await this.importsLogic.commitImport(userId, rows, today);
      const actions: ChatAction[] = [
        {
          tool: 'import_commit',
          type: 'meal_created',
          label: `Imported ${result.imported} ${result.imported === 1 ? 'meal' : 'meals'} from a PDF`,
        },
      ];

      return {
        reply: `Saved ${result.imported} ${result.imported === 1 ? 'meal' : 'meals'} from the PDF. They are in your diary now.`,
        actions,
        pendingAction: null,
      };
    }

    const edited = editImportRows(rows, text);
    if (edited.status === 'none') {
      return { reply: '', actions: [], pendingAction: pending, unhandled: true };
    }

    if (edited.status === 'ambiguous') {
      return {
        reply: `${edited.message}\n\n${formatImportTable(rows)}`,
        actions: [],
        pendingAction: pending,
      };
    }

    const next = createPending('review_import', pending.originalRequest, []);
    next.importRows = edited.rows;

    return {
      reply: `Updated draft:\n\n${formatImportTable(edited.rows)}\n\nAnything else to change, or shall I log these?`,
      actions: [],
      pendingAction: next,
    };
  }

  async interpretAttachMessage(
    pending: PendingAction,
    text: string,
    today: string,
    userId: string,
  ): Promise<PendingOutcome & { unhandled?: boolean }> {
    const completion = await this.chatProvider.complete({
      messages: [
        { role: 'system', content: this.buildInterpretPrompt(pending) },
        { role: 'user', content: text },
      ],
      jsonSchema: { name: 'attach_intent', schema: INTERPRET_SCHEMA },
      temperature: 0.1,
      maxTokens: 500,
      rejectionMessage: 'I could not tell what to change. Name a row and column, or say when to log it.',
    });

    let parsed: InterpretedAttach;
    try {
      parsed = parseJsonContent<InterpretedAttach>(completion.content);
    } catch {
      return { reply: '', actions: [], pendingAction: pending, unhandled: true };
    }

    const action = String(parsed.action ?? 'other').toLowerCase();

    if (action === 'other') {
      return { reply: '', actions: [], pendingAction: pending, unhandled: true };
    }

    if (action === 'ask') {
      return {
        reply: parsed.question?.trim() || 'Which row and column should I change?',
        actions: [],
        pendingAction: pending,
      };
    }

    if (action === 'confirm') {
      return this.applyAttachPending(userId, pending, 'log it', today, { confirm: true });
    }

    if (action === 'cancel') {
      return this.applyAttachPending(userId, pending, 'cancel', today, { confirm: false });
    }

    if (pending.kind === 'confirm_extract' && pending.extract) {
      const edited = this.applyInterpretedExtract(pending.extract, parsed);
      if (!edited) {
        return { reply: '', actions: [], pendingAction: pending, unhandled: true };
      }

      const next = createPending('confirm_extract', pending.originalRequest, []);
      next.extract = edited;

      return {
        reply: `Updated draft:\n\n${formatExtraction(edited)}\n\nAnything else, or shall I log it?`,
        actions: [],
        pendingAction: next,
      };
    }

    if (pending.kind === 'review_import' && pending.importRows) {
      const edited = this.applyInterpretedImport(pending.importRows, parsed.edits ?? []);
      if (!edited) {
        return { reply: '', actions: [], pendingAction: pending, unhandled: true };
      }

      const next = createPending('review_import', pending.originalRequest, []);
      next.importRows = edited;

      return {
        reply: `Updated draft:\n\n${formatImportTable(edited)}\n\nAnything else to change, or shall I log these?`,
        actions: [],
        pendingAction: next,
      };
    }

    return { reply: '', actions: [], pendingAction: pending, unhandled: true };
  }

  private buildInterpretPrompt(pending: PendingAction): string {
    const draft =
      pending.kind === 'review_import'
        ? JSON.stringify(pending.importRows ?? [])
        : JSON.stringify({
            foodName: pending.extract?.entry.foodName,
            mealType: pending.extract?.suggestedMealType,
            quantity: pending.extract?.entry.quantity,
            unit: pending.extract?.entry.unit,
            calories: pending.extract?.entry.calories,
            proteinGrams: pending.extract?.entry.proteinGrams,
            carbGrams: pending.extract?.entry.carbGrams,
            fatGrams: pending.extract?.entry.fatGrams,
          });

    return `The user is reviewing a draft that has not been saved. Here is the draft JSON:\n${draft}\n
  Decide what they want. action must be one of:
  - confirm: they want the draft saved
  - cancel: they want the draft discarded
  - edit: they want numbers or names changed
  - ask: they asked a question about the draft
  - other: the message is not about this draft
  For edit on a photo draft, fill the fields that change. For edit on a table, fill edits with 1-based row, field (foodName, mealType, quantity, unit, calories, proteinGrams, carbGrams, fatGrams, consumedOn), and value.
  Do not invent rows. Meal types are ${MEAL_TYPES.join(', ')}.`;
  }

  private applyInterpretedExtract(result: ExtractionResult, parsed: InterpretedAttach): ExtractionResult | null {
    const entry = { ...result.entry };
    let changed = false;
    let mealType = result.suggestedMealType;

    if (typeof parsed.foodName === 'string' && parsed.foodName.trim()) {
      entry.foodName = parsed.foodName.trim();
      changed = true;
    }

    if (typeof parsed.unit === 'string' && parsed.unit.trim()) {
      entry.unit = parsed.unit.trim();
      changed = true;
    }

    if (typeof parsed.mealType === 'string') {
      const meal = MEAL_TYPES.find((type) => parsed.mealType?.toLowerCase().includes(type));
      if (meal) {
        mealType = meal;
        changed = true;
      }
    }

    for (const field of ['quantity', 'calories', 'proteinGrams', 'carbGrams', 'fatGrams'] as const) {
      const value = parsed[field];
      if (typeof value === 'number' && Number.isFinite(value)) {
        entry[field] = value;
        changed = true;
      }
    }

    return changed ? { ...result, suggestedMealType: mealType, entry } : null;
  }

  private applyInterpretedImport(
    rows: ImportDraftRow[],
    edits: { row?: number; field?: string; value?: string | number }[],
  ): ImportDraftRow[] | null {
    if (edits.length === 0) {
      return null;
    }

    const next = rows.map((row) => ({ ...row }));
    let changed = false;

    for (const edit of edits) {
      const index = (edit.row ?? 0) - 1;
      const field = COLUMNS[String(edit.field ?? '').toLowerCase()] ?? (edit.field as keyof ImportDraftRow | undefined);

      const target = next[index];
      if (
          index < 0 ||
          !target ||
          !field ||
          !Object.prototype.hasOwnProperty.call(target, field) ||
          edit.value === undefined
        ) {
        continue;
      }

      applyField(target, field, edit.value);
      changed = true;
    }

    return changed ? next : null;
  }
}
