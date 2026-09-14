import type { MealType } from '../../../common/nutrition.js';

export interface EntryRef {
  entryId: string;
  foodName: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  calories: number;
  consumedOn: string;
}

export interface ResolveHint {
  from?: string;
  to?: string;
  mealType?: MealType;
  search?: string;
  calories?: number;
  index?: number;
}

export type ResolveResult =
  | { status: 'none' }
  | { status: 'one'; entry: EntryRef }
  | { status: 'many'; entries: EntryRef[] };

export function toEntryRef(entry: {
  id: string;
  foodName: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  calories: number;
  consumedOn: string;
}): EntryRef {
  return {
    entryId: entry.id,
    foodName: entry.foodName,
    mealType: entry.mealType,
    quantity: entry.quantity,
    unit: entry.unit,
    calories: entry.calories,
    consumedOn: entry.consumedOn,
  };
}

export function resolveAmong(entries: EntryRef[], hint: ResolveHint): ResolveResult {
  if (entries.length === 0) {
    return { status: 'none' };
  }

  let pool = entries;

  if (hint.mealType) {
    const byMeal = pool.filter((entry) => entry.mealType === hint.mealType);
    if (byMeal.length > 0) {
      pool = byMeal;
    }
  }

  if (hint.search) {
    const needle = hint.search.toLowerCase();
    const byName = pool.filter((entry) => entry.foodName.toLowerCase().includes(needle));
    if (byName.length > 0) {
      pool = byName;
    }
  }

  if (hint.calories !== undefined) {
    const byCalories = pool.filter((entry) => Math.abs(entry.calories - hint.calories!) <= 15);
    if (byCalories.length > 0) {
      pool = byCalories;
    }
  }

  if (hint.index !== undefined && hint.index >= 1 && hint.index <= pool.length) {
    const picked = pool[hint.index - 1];
    return picked ? { status: 'one', entry: picked } : { status: 'none' };
  }

  if (pool.length === 1 && pool[0]) {
    return { status: 'one', entry: pool[0] };
  }

  return pool.length === 0 ? { status: 'none' } : { status: 'many', entries: pool };
}

export function mealTypeFromText(text: string): MealType | undefined {
  const normalised = text.toLowerCase();

  if (/\bbreakfast\b/.test(normalised)) {
    return 'breakfast';
  }

  if (/\blunch\b/.test(normalised)) {
    return 'lunch';
  }

  if (/\bdinner\b|\bsupper\b/.test(normalised)) {
    return 'dinner';
  }

  if (/\bsnack/.test(normalised)) {
    return 'snack';
  }

  return undefined;
}

export function hintFromText(text: string): ResolveHint {
  const hint: ResolveHint = { mealType: mealTypeFromText(text) };

  // A reply that is nothing but a number is answering "which one?", whatever its
  // width. Checked first, because a bare "10" is a choice and not 10 kcal.
  const onlyANumber = text.trim().match(/^(?:number\s*)?([1-9]|10)$/i);
  const withUnit = text.match(/\b(\d{2,5})\s*(?:kcal|calories)\b/i);

  if (onlyANumber) {
    hint.index = Number(onlyANumber[1]);
  } else if (withUnit) {
    hint.calories = Number(withUnit[1]);
  } else {
    const bareAmount = text.match(/\b(\d{2,5})\b/);
    const smallIndex = text.match(/\b(?:number\s*)?([1-9])\b/);

    if (bareAmount) {
      hint.calories = Number(bareAmount[1]);
    } else if (smallIndex) {
      hint.index = Number(smallIndex[1]);
    }
  }

  const leftover = text
    .toLowerCase()
    .replace(
      /\b(the|that|this|my|yesterday|today|meal|entry|one|please|delete|remove|lunch|dinner|breakfast|snacks?|supper)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  if (leftover.length >= 3 && leftover.split(/\s+/).length <= 4) {
    hint.search = leftover;
  }

  return hint;
}
