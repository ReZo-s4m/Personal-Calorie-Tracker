import type { PrismaClient } from '@prisma/client';
import type { IClock } from '../../common/clock.js';
import {
  addDays,
  differenceInDays,
  eachDayInRange,
  startOfIsoWeek,
  startOfUtcDay,
  toDateKey,
} from '../../common/dates.js';
import { badRequest } from '../../common/errors.js';
import { MACRO_KEYS, labelForNutrient } from '../../common/nutrition.js';
import { paginate, type Paginated } from '../../common/pagination.js';
import type { ITargetsLogic } from '../targets/ITargetsLogic.js';
import type { TargetResponse } from '../targets/models/targets.models.js';
import type { IReportsLogic } from './IReportsLogic.js';
import type {
  DailyReportRow,
  DailyTotals,
  TargetComparison,
  MacroBreakdown,
  MacroTotals,
  MicronutrientRow,
  ReportRangeQuery,
  ResolvedRange,
  WeeklyReportRow,
} from './models/reports.models.js';

const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;

export class ReportsLogic implements IReportsLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly targetsLogic: ITargetsLogic,
    private readonly clock: IClock,
  ) {}

  resolveRange(query: ReportRangeQuery): ResolvedRange {
    let to = startOfUtcDay(query.to ?? this.clock.now());
    let from = startOfUtcDay(query.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1)));

    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }

    const days = differenceInDays(to, from) + 1;

    if (days > MAX_RANGE_DAYS) {
      throw badRequest(`Date range must be ${MAX_RANGE_DAYS} days or fewer (received ${days}).`);
    }

    return { from, to, days };
  }

  async getDailyReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<Paginated<DailyReportRow> & { range: { from: string; to: string } }> {
    const { from, to } = this.resolveRange(query);
    const [totals, goals] = await Promise.all([
      this.buildDailyTotals(userId, from, to),
      this.targetsLogic.getTargetsCovering(userId, from, to),
    ]);

    const rows: DailyReportRow[] = totals.map((day) => {
      const goal = this.targetForDay(goals, day.date);

      return {
        ...day,
        goal: goal
          ? {
              dailyCalories: goal.dailyCalories,
              proteinGrams: goal.proteinGrams,
              carbGrams: goal.carbGrams,
              fatGrams: goal.fatGrams,
            }
          : null,
        caloriesRemaining: goal ? this.round(goal.dailyCalories - day.calories) : null,
      };
    });

    const ordered = [...rows].reverse();
    const start = (query.page - 1) * query.pageSize;

    return {
      ...paginate(ordered.slice(start, start + query.pageSize), ordered.length, query),
      range: { from: toDateKey(from), to: toDateKey(to) },
    };
  }

  async getWeeklyReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<Paginated<WeeklyReportRow> & { range: { from: string; to: string } }> {
    const { from, to } = this.resolveRange(query);
    const totals = await this.buildDailyTotals(userId, from, to);

    const buckets = new Map<string, WeeklyReportRow>();

    for (const day of totals) {
      const weekStart = startOfIsoWeek(new Date(`${day.date}T00:00:00Z`));
      const key = toDateKey(weekStart);

      const bucket = buckets.get(key) ?? {
        weekStart: key,
        weekEnd: toDateKey(addDays(weekStart, 6)),
        calories: 0,
        proteinGrams: 0,
        carbGrams: 0,
        fatGrams: 0,
        entryCount: 0,
        daysLogged: 0,
        averageDailyCalories: 0,
      };

      bucket.calories += day.calories;
      bucket.proteinGrams += day.proteinGrams;
      bucket.carbGrams += day.carbGrams;
      bucket.fatGrams += day.fatGrams;
      bucket.entryCount += day.entryCount;
      bucket.daysLogged += day.entryCount > 0 ? 1 : 0;

      buckets.set(key, bucket);
    }

    const rows = [...buckets.values()]
      .map((bucket) => ({
        ...bucket,
        calories: this.round(bucket.calories),
        proteinGrams: this.round(bucket.proteinGrams),
        carbGrams: this.round(bucket.carbGrams),
        fatGrams: this.round(bucket.fatGrams),
        averageDailyCalories:
          bucket.daysLogged > 0 ? this.round(bucket.calories / bucket.daysLogged) : 0,
      }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    const start = (query.page - 1) * query.pageSize;

    return {
      ...paginate(rows.slice(start, start + query.pageSize), rows.length, query),
      range: { from: toDateKey(from), to: toDateKey(to) },
    };
  }

  async getMicronutrientReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<Paginated<MicronutrientRow> & { range: { from: string; to: string }; days: number }> {
    const { from, to, days } = this.resolveRange(query);

    const grouped = await this.prisma.dietNutrient.groupBy({
      by: ['nutrient', 'unit'],
      where: { entry: { userId, consumedOn: { gte: from, lte: to } } },
      _sum: { amount: true },
    });

    // The group is by (nutrient, unit), so a nutrient stored under two units
    // comes back twice. Fold those together rather than reporting it as two.
    const byNutrient = new Map<string, { total: number; unit: string }>();

    for (const row of grouped) {
      const existing = byNutrient.get(row.nutrient);
      byNutrient.set(row.nutrient, {
        total: (existing?.total ?? 0) + (row._sum.amount ?? 0),
        unit: existing?.unit ?? row.unit,
      });
    }

    const rows: MicronutrientRow[] = [...byNutrient.entries()]
      .map(([nutrient, { total: summed, unit }]) => {
        const total = this.round(summed);

        return {
          nutrient,
          label: labelForNutrient(nutrient),
          total,
          averagePerDay: this.round(total / days),
          unit,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const start = (query.page - 1) * query.pageSize;

    return {
      ...paginate(rows.slice(start, start + query.pageSize), rows.length, query),
      range: { from: toDateKey(from), to: toDateKey(to) },
      days,
    };
  }

  async getTargetComparison(userId: string, query: ReportRangeQuery): Promise<TargetComparison> {
    const { from, to, days } = this.resolveRange(query);
    const [totals, goals] = await Promise.all([
      this.buildDailyTotals(userId, from, to),
      this.targetsLogic.getTargetsCovering(userId, from, to),
    ]);

    const actual = { calories: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0 };
    const target = { calories: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0 };
    let daysLogged = 0;
    let daysWithTarget = 0;

    for (const day of totals) {
      actual.calories += day.calories;
      actual.proteinGrams += day.proteinGrams;
      actual.carbGrams += day.carbGrams;
      actual.fatGrams += day.fatGrams;

      if (day.entryCount > 0) {
        daysLogged += 1;
      }

      const goal = this.targetForDay(goals, day.date);

      if (goal) {
        daysWithTarget += 1;
        target.calories += goal.dailyCalories;
        target.proteinGrams += goal.proteinGrams;
        target.carbGrams += goal.carbGrams;
        target.fatGrams += goal.fatGrams;
      }
    }

    const percentage = (value: number, of: number) =>
      of === 0 ? 0 : this.round((value / of) * 100);

    return {
      range: { from: toDateKey(from), to: toDateKey(to), days },
      daysLogged,
      actual: {
        calories: this.round(actual.calories),
        proteinGrams: this.round(actual.proteinGrams),
        carbGrams: this.round(actual.carbGrams),
        fatGrams: this.round(actual.fatGrams),
        averageDailyCalories: daysLogged > 0 ? this.round(actual.calories / daysLogged) : 0,
      },
      target: {
        calories: this.round(target.calories),
        proteinGrams: this.round(target.proteinGrams),
        carbGrams: this.round(target.carbGrams),
        fatGrams: this.round(target.fatGrams),
        averageDailyCalories: daysWithTarget > 0 ? this.round(target.calories / daysWithTarget) : 0,
      },
      adherence:
        daysWithTarget === 0
          ? null
          : {
              calories: percentage(actual.calories, target.calories),
              proteinGrams: percentage(actual.proteinGrams, target.proteinGrams),
              carbGrams: percentage(actual.carbGrams, target.carbGrams),
              fatGrams: percentage(actual.fatGrams, target.fatGrams),
            },
      hasGoal: daysWithTarget > 0,
    };
  }

  async getMacroBreakdown(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<MacroBreakdown & { range: { from: string; to: string } }> {
    const { from, to } = this.resolveRange(query);

    const sums = await this.prisma.dietEntry.aggregate({
      where: { userId, consumedOn: { gte: from, lte: to } },
      _sum: { proteinGrams: true, carbGrams: true, fatGrams: true },
    });

    const grams: MacroTotals = {
      proteinGrams: this.round(sums._sum.proteinGrams ?? 0),
      carbGrams: this.round(sums._sum.carbGrams ?? 0),
      fatGrams: this.round(sums._sum.fatGrams ?? 0),
    };

    const energy = {
      proteinGrams: grams.proteinGrams * 4,
      carbGrams: grams.carbGrams * 4,
      fatGrams: grams.fatGrams * 9,
    };

    const totalEnergy = MACRO_KEYS.reduce((sum, key) => sum + energy[key], 0);
    const share = (value: number) =>
      totalEnergy === 0 ? 0 : this.round((value / totalEnergy) * 100);

    const proteinShare = share(energy.proteinGrams);
    const carbShare = share(energy.carbGrams);

    return {
      grams,
      caloriePercentage: {
        proteinGrams: proteinShare,
        carbGrams: carbShare,
        fatGrams: totalEnergy === 0 ? 0 : this.round(100 - proteinShare - carbShare),
      },
      range: { from: toDateKey(from), to: toDateKey(to) },
    };
  }

  private async sumByDay(userId: string, from: Date, to: Date) {
    const grouped = await this.prisma.dietEntry.groupBy({
      by: ['consumedOn'],
      where: { userId, consumedOn: { gte: from, lte: to } },
      _sum: { calories: true, proteinGrams: true, carbGrams: true, fatGrams: true },
      _count: { _all: true },
    });

    return new Map(
      grouped.map((row) => [
        toDateKey(row.consumedOn),
        {
          calories: row._sum.calories ?? 0,
          proteinGrams: row._sum.proteinGrams ?? 0,
          carbGrams: row._sum.carbGrams ?? 0,
          fatGrams: row._sum.fatGrams ?? 0,
          entryCount: row._count._all,
        },
      ]),
    );
  }

  private async buildDailyTotals(userId: string, from: Date, to: Date): Promise<DailyTotals[]> {
    const totals = await this.sumByDay(userId, from, to);

    return eachDayInRange(from, to).map((day) => {
      const key = toDateKey(day);
      const found = totals.get(key);

      return {
        date: key,
        calories: found?.calories ?? 0,
        proteinGrams: found?.proteinGrams ?? 0,
        carbGrams: found?.carbGrams ?? 0,
        fatGrams: found?.fatGrams ?? 0,
        entryCount: found?.entryCount ?? 0,
      };
    });
  }

  private targetForDay(goals: TargetResponse[], dateKey: string): TargetResponse | null {
    return goals.find((goal) => goal.effectiveFrom <= dateKey) ?? null;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
