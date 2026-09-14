import type { MealRecommendation, RemainingNutrition } from './models/recommend.models.js';

export interface IRecommendLogic {
  /** Today's targets, what has been eaten, and what is left. */
  getRemainingNutrition(userId: string, date: string): Promise<RemainingNutrition>;

  /** A shortlist that fits the remaining budget. Suggestions, not diary rows. */
  recommendFoods(userId: string, date: string): Promise<MealRecommendation>;
}
