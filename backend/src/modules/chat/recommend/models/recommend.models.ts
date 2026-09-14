export interface RemainingNutrition {
  date: string;
  hasGoal: boolean;
  target: { calories: number; proteinGrams: number; carbGrams: number; fatGrams: number } | null;
  eaten: { calories: number; proteinGrams: number; carbGrams: number; fatGrams: number };
  remaining: { calories: number; proteinGrams: number; carbGrams: number; fatGrams: number };
}


/** One shortlist entry. Not a diary row: nothing here has been logged. */
export interface FoodSuggestion {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface MealRecommendation {
  remaining: RemainingNutrition;
  suggestions: readonly FoodSuggestion[];
  message: string;
}
