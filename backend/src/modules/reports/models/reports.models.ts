import type { PaginationQuery } from '../../../common/pagination.js';

/** Wire in: every report endpoint takes the same window. */
export interface ReportRangeQuery extends PaginationQuery {
  from?: Date;
  to?: Date;
}

export interface MacroTotals {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface DailyTotals extends MacroTotals {
  date: string;
  calories: number;
  entryCount: number;
}

/** Wire out: one day, against the goal that was in force on that day. */
export interface DailyReportRow extends DailyTotals {
  goal: ({ dailyCalories: number } & MacroTotals) | null;
  caloriesRemaining: number | null;
}

export interface WeeklyReportRow extends MacroTotals {
  weekStart: string;
  weekEnd: string;
  calories: number;
  entryCount: number;
  daysLogged: number;
  averageDailyCalories: number;
}

export interface MicronutrientRow {
  nutrient: string;
  label: string;
  total: number;
  averagePerDay: number;
  unit: string;
}

export interface TargetComparison {
  range: { from: string; to: string; days: number };
  daysLogged: number;
  actual: { calories: number; averageDailyCalories: number } & MacroTotals;
  target: { calories: number; averageDailyCalories: number } & MacroTotals;
  adherence: { calories: number; proteinGrams: number; carbGrams: number; fatGrams: number } | null;
  hasGoal: boolean;
}

export interface MacroBreakdown {
  grams: MacroTotals;
  /** Each macro's share of energy at 4/4/9 kcal per gram. */
  caloriePercentage: MacroTotals;
}

export interface ResolvedRange {
  from: Date;
  to: Date;
  days: number;
}

export interface ReportPdf {
  buffer: Buffer;
  filename: string;
}
