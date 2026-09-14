import type { PaginationQuery } from '../../../common/pagination.js';

/** Wire in. */
export interface CreateTargetRequest {
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  targetWeightKg?: number;
  effectiveFrom?: Date;
}

export type ListTargetsQuery = PaginationQuery;

/** Wire out. Goals are versioned by effectiveFrom. */
export interface TargetResponse {
  id: string;
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  targetWeightKg: number | null;
  effectiveFrom: string;
  createdAt: string;
}
