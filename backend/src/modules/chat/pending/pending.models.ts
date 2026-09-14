import type { MealType } from '../../../common/nutrition.js';
import type { ExtractionResult } from '../../ai/models/extraction.models.js';
import type { ImportDraftRow } from '../../../providers/diary/diary-text.parser.js';
import type { ChatAction } from '../models/chat.models.js';
import type { EntryRef } from './resolve.js';

export type PendingKind =
  | 'choose_delete'
  | 'choose_update'
  | 'confirm_bulk_delete'
  | 'confirm_extract'
  | 'review_import';

export interface PendingAction {
  kind: PendingKind;
  originalRequest: string;
  candidates: EntryRef[];

  patch?: {
    foodName?: string;
    mealType?: MealType;
    quantity?: number;
    unit?: string;
    calories?: number;
    proteinGrams?: number;
    carbGrams?: number;
    fatGrams?: number;
  };

  extract?: ExtractionResult;

  importRows?: ImportDraftRow[];
  expiresAt: string;
}

export interface PendingChoice {
  entryId?: string;
  index?: number;
  confirm?: boolean;
}

export interface PendingOutcome {
  reply: string;
  actions: ChatAction[];
  pendingAction: PendingAction | null;
}

