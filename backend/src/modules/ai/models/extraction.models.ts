import type { MealType } from '../../../common/nutrition.js';

export type { MealType };

export interface ExtractedEntry {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  micronutrients: { nutrient: string; label: string; amount: number; unit: string }[];
}

export interface ExtractedComponent {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface ExtractionResult {
  source: 'nutrition_label' | 'meal_photo';
  suggestedMealType: MealType | null;

  entry: ExtractedEntry;

  components: ExtractedComponent[];

  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  notes: string | null;
}

export interface RawExtraction {
  source: string;
  suggestedMealType: string | null;
  confidence: string;
  notes: string | null;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  micronutrients: { nutrient: string; amount: number }[];
  components: RawComponent[];
}

export interface RawComponent {
  name: string;
  calories: number;
  quantity?: number;
  unit?: string;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
}

