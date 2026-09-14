import {
  CALORIES_PER_GRAM,
  MEAL_TYPES,
  isKnownMicronutrient,
  type MealType,
} from '../../../common/nutrition.js';
import { badRequest } from '../../../common/errors.js';
import type { CreateEntryRequest } from '../../entries/models/entries.models.js';

/**
 * Coercion for whatever the model puts in a tool call. Pure functions with no
 * collaborators, so they stay functions rather than becoming a class.
 */

export const LIMITS = {

  amount: 100_000,
  quantity: 10_000,
  dailyCalories: 20_000,
  macroTarget: 2_000,
  targetWeightKg: 500,
} as const;

export const MAX_MICRONUTRIENTS = 8;
export const DEFAULT_ENTRY_RESULTS = 10;
export const MAX_ENTRY_RESULTS = 20;

export const MAX_DAILY_ROWS = 31;
export const MAX_WEEKLY_ROWS = 8;
export const MAX_MICRONUTRIENT_ROWS = 30;
export const SUMMARY_DEFAULT_DAYS = 7;

export const DEFAULT_MACRO_SPLIT = { protein: 0.3, carbs: 0.4, fat: 0.3 } as const;

export const BREAKDOWNS = ['daily', 'weekly', 'macros', 'micronutrients', 'goal_vs_actual'] as const;
export type Breakdown = (typeof BREAKDOWNS)[number];

export function parseArguments(raw: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {

    return {};
  }
}

export function timestampFor(consumedOn: string, today: string): Date {
  return consumedOn === today ? new Date() : new Date(`${consumedOn}T12:00:00.000Z`);
}

export function macroTarget(
  args: Record<string, unknown>,
  key: string,
  carriedOver: number | undefined,
  calories: number,
  macro: keyof typeof DEFAULT_MACRO_SPLIT,
): number {
  const given = amountOrUndefined(readNumber(args, key), LIMITS.macroTarget);

  if (given !== undefined) {
    return given;
  }

  if (carriedOver !== undefined) {
    return carriedOver;
  }

  return Math.min(
    Math.round((calories * DEFAULT_MACRO_SPLIT[macro]) / CALORIES_PER_GRAM[macro]),
    LIMITS.macroTarget,
  );
}

export function readMicronutrients(args: Record<string, unknown>): CreateEntryRequest['micronutrients'] {
  const raw = args.micronutrients;

  if (!Array.isArray(raw)) {
    return [];
  }

  const byKey = new Map<string, { nutrient: string; amount: number }>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const entry = item as Record<string, unknown>;
    const nutrient = readString(entry, 'nutrient')?.toLowerCase();

    if (!nutrient || !isKnownMicronutrient(nutrient)) {
      continue;
    }

    byKey.set(nutrient, { nutrient, amount: clampAmount(readNumber(entry, 'amount'), 0) });
  }

  return [...byKey.values()].slice(0, MAX_MICRONUTRIENTS);
}

export function optional<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<K, V>>);
}

export const clamp = (value: number | undefined, fallback: number, max: number): number =>
  Math.min(Math.max(value ?? fallback, 0), max);

export const clampAmount = (value: number | undefined, fallback: number): number =>
  clamp(value, fallback, LIMITS.amount);

export const amountOrUndefined = (
  value: number | undefined,
  max: number = LIMITS.amount,
): number | undefined => (value === undefined ? undefined : clamp(value, 0, max));

export function readString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function readNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function readMealType(args: Record<string, unknown>, key: string): MealType | undefined {
  const value = readString(args, key)?.toLowerCase();

  return value && (MEAL_TYPES as readonly string[]).includes(value) ? (value as MealType) : undefined;
}

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function readDateKey(args: Record<string, unknown>, key: string): string | undefined {
  const candidate = readString(args, key)?.slice(0, 10);

  if (!candidate || !DATE_KEY_PATTERN.test(candidate)) {
    return undefined;
  }

  return Number.isNaN(Date.parse(candidate)) ? undefined : candidate;
}

export function readBreakdown(args: Record<string, unknown>): Breakdown {
  const value = readString(args, 'breakdown')?.toLowerCase();

  if (!value || !(BREAKDOWNS as readonly string[]).includes(value)) {
    throw badRequest(`breakdown must be one of: ${BREAKDOWNS.join(', ')}.`);
  }

  return value as Breakdown;
}

