import type { EntrySource, MealType } from '../../../common/nutrition.js';
import type { PaginationQuery } from '../../../common/pagination.js';

export type { EntrySource, MealType };

export interface MicronutrientInput {
  nutrient: string;
  amount: number;
  unit?: string;
}

/** Wire in. */
export interface CreateEntryRequest {
  foodName: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  calories: number;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
  consumedAt?: Date;
  consumedOn?: string;
  notes?: string;
  micronutrients?: MicronutrientInput[];
}

export type UpdateEntryRequest = Partial<CreateEntryRequest>;

export interface CreateEntriesBatchRequest {
  entries: CreateEntryRequest[];
  source?: 'manual' | 'image';
}

export type EntrySortField = 'consumedAt' | 'calories' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface ListEntriesQuery extends PaginationQuery {
  from?: Date;
  to?: Date;
  mealType?: MealType;
  search?: string;
  sort: EntrySortField;
  order: SortOrder;
}

export interface MacroTotals {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

/** Wire out. */
export interface EntryResponse {
  id: string;
  foodName: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  calories: number;
  macros: MacroTotals;
  micronutrients: { nutrient: string; label: string; amount: number; unit: string }[];
  consumedAt: string;
  consumedOn: string;
  source: EntrySource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntryTotals extends MacroTotals {
  calories: number;
}
