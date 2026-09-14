import {
  CALORIES_PER_GRAM,
  MEAL_TYPES,
  isKnownMicronutrient,
  labelForNutrient,
  unitForNutrient,
  type MealType,
} from '../../common/nutrition.js';
import { AiResponseError } from '../../providers/ai/index.js';
import { unprocessable } from '../../common/errors.js';
import type {
  ExtractedComponent,
  ExtractedEntry,
  ExtractionResult,
  RawComponent,
  RawExtraction,
} from './models/extraction.models.js';

const MAX_CALORIES = 20_000;

export function sanitiseExtraction(raw: RawExtraction): ExtractionResult {
  if (!raw || typeof raw !== 'object') {
    throw new AiResponseError('The AI response was not an object.');
  }

  const foodName = typeof raw.foodName === 'string' ? raw.foodName.trim() : '';

  if (foodName.length === 0) {
    throw unprocessable(
      'No food or nutrition label could be recognised in this image. Try a clearer photo, or add the entry manually.',
    );
  }

  const calories = clamp(raw.calories, 0, MAX_CALORIES);
  const proteinGrams = clamp(raw.proteinGrams, 0, 5_000);
  const carbGrams = clamp(raw.carbGrams, 0, 5_000);
  const fatGrams = clamp(raw.fatGrams, 0, 5_000);

  const entry: ExtractedEntry = {
    foodName: foodName.slice(0, 160),
    quantity: clamp(raw.quantity, 0.01, 10_000, 1),
    unit: (raw.unit || 'serving').trim().slice(0, 24) || 'serving',
    calories: round(calories),
    proteinGrams: round(proteinGrams),
    carbGrams: round(carbGrams),
    fatGrams: round(fatGrams),
    micronutrients: sanitiseMicronutrients(raw.micronutrients),
  };

  const components = sanitiseComponents(raw.components);

  return {
    source: raw.source === 'nutrition_label' ? 'nutrition_label' : 'meal_photo',
    suggestedMealType: isMealType(raw.suggestedMealType) ? raw.suggestedMealType : null,
    entry,
    components,
    confidence: isConfidence(raw.confidence) ? raw.confidence : 'low',
    warnings: collectWarnings(entry, components),
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim().slice(0, 400) : null,
  };
}

const DRIFT_TOLERANCE = 0.25;

function collectWarnings(
  entry: ExtractedEntry,
  components: ExtractedComponent[],
): string[] {
  const warnings: string[] = [];

  const impliedCalories =
    entry.proteinGrams * CALORIES_PER_GRAM.protein +
    entry.carbGrams * CALORIES_PER_GRAM.carbs +
    entry.fatGrams * CALORIES_PER_GRAM.fat;

  if (impliedCalories > 0 && entry.calories > 0 && drifts(impliedCalories, entry.calories)) {
    warnings.push(
      `The macros add up to about ${Math.round(impliedCalories)} kcal, but ${Math.round(entry.calories)} kcal was read. Please check before saving.`,
    );
  }

  const componentCalories = components.reduce((sum, item) => sum + item.calories, 0);

  if (componentCalories > 0 && entry.calories > 0 && drifts(componentCalories, entry.calories)) {
    warnings.push(
      `The items listed come to about ${Math.round(componentCalories)} kcal, but the total says ${Math.round(entry.calories)} kcal.`,
    );
  }

  return warnings;
}

const drifts = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) > DRIFT_TOLERANCE;

function sanitiseComponents(input: RawComponent[] | undefined): ExtractedComponent[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item) => typeof item?.name === 'string' && item.name.trim().length > 0)
    .slice(0, 20)
    .map((item) => ({
      name: item.name.trim().slice(0, 80),
      quantity: clamp(item.quantity, 0.01, 10_000, 1),
      unit: (typeof item.unit === 'string' && item.unit.trim() ? item.unit : 'serving')
        .trim()
        .slice(0, 24),
      calories: round(clamp(item.calories, 0, MAX_CALORIES)),
      proteinGrams: round(clamp(item.proteinGrams, 0, 5_000)),
      carbGrams: round(clamp(item.carbGrams, 0, 5_000)),
      fatGrams: round(clamp(item.fatGrams, 0, 5_000)),
    }));
}

const MAX_MICRONUTRIENTS = 8;

function sanitiseMicronutrients(input: { nutrient: string; amount: number }[] | undefined) {
  if (!Array.isArray(input)) {
    return [];
  }

  const byKey = new Map<string, { nutrient: string; label: string; amount: number; unit: string }>();

  for (const item of input) {
    const key = typeof item?.nutrient === 'string' ? item.nutrient.trim().toLowerCase() : '';

    if (!isKnownMicronutrient(key)) {
      continue;
    }

    byKey.set(key, {
      nutrient: key,
      label: labelForNutrient(key),
      amount: round(clamp(item.amount, 0, 100_000)),
      unit: unitForNutrient(key),
    });
  }

  return [...byKey.values()].slice(0, MAX_MICRONUTRIENTS);
}

const isMealType = (value: unknown): value is MealType =>
  typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value);

const isConfidence = (value: unknown): value is 'high' | 'medium' | 'low' =>
  value === 'high' || value === 'medium' || value === 'low';

function clamp(value: unknown, min: number, max: number, fallback = 0): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(numeric, min), max);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
