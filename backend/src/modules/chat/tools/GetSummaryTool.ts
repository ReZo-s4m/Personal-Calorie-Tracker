import { addDays, fromDateKey, toDateKey } from '../../../common/dates.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  BREAKDOWNS,
  MAX_DAILY_ROWS,
  MAX_MICRONUTRIENT_ROWS,
  MAX_WEEKLY_ROWS,
  SUMMARY_DEFAULT_DAYS,
  readBreakdown,
  readDateKey,
} from './tool-args.js';
import type { IReportsLogic } from '../../reports/IReportsLogic.js';

export class GetSummaryTool implements IChatTool {
  constructor(private readonly reportsLogic: IReportsLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'get_summary',
      description:
        'Totals over a range, already aggregated. Use "daily" for per-day calories against the goal, "weekly" for week rollups, "macros" for the protein/carb/fat split, "micronutrients" for vitamins and minerals, "goal_vs_actual" for adherence.',
      parameters: {
        type: 'object',
        required: ['breakdown'],
        properties: {
          breakdown: { type: 'string', enum: BREAKDOWNS },
          from: {
            type: 'string',
            description: `First day, YYYY-MM-DD. Defaults to today for "daily", otherwise ${SUMMARY_DEFAULT_DAYS} days back.`,
          },
          to: { type: 'string', description: 'Last day, YYYY-MM-DD. Defaults to today.' },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const breakdown = readBreakdown(args);
    const to = readDateKey(args, 'to') ?? context.today;
    const from =
      readDateKey(args, 'from') ??
      (breakdown === 'daily' ? to : toDateKey(addDays(fromDateKey(to), -(SUMMARY_DEFAULT_DAYS - 1))));

    const range = { from: fromDateKey(from), to: fromDateKey(to) };
    const userId = context.userId;

    if (breakdown === 'macros') {

      return { result: await this.reportsLogic.getMacroBreakdown(userId, { ...range, page: 1, pageSize: 1 }) };
    }

    if (breakdown === 'goal_vs_actual') {
      return { result: await this.reportsLogic.getTargetComparison(userId, { ...range, page: 1, pageSize: 1 }) };
    }

    if (breakdown === 'micronutrients') {
      const report = await this.reportsLogic.getMicronutrientReport(userId, {
        ...range,
        page: 1,
        pageSize: MAX_MICRONUTRIENT_ROWS,
      });

      return {
        result: {
          range: { from, to },
          days: report.days,
          nutrients: report.data.map((row) => ({
            label: row.label,
            total: row.total,
            averagePerDay: row.averagePerDay,
            unit: row.unit,
          })),
        },
      };
    }

    if (breakdown === 'weekly') {
      const report = await this.reportsLogic.getWeeklyReport(userId, {
        ...range,
        page: 1,
        pageSize: MAX_WEEKLY_ROWS,
      });

      return {
        result: {
          range: { from, to },
          weeks: report.data.map((row) => ({
            weekStart: row.weekStart,
            weekEnd: row.weekEnd,
            calories: row.calories,
            averageDailyCalories: row.averageDailyCalories,
            proteinGrams: row.proteinGrams,
            carbGrams: row.carbGrams,
            fatGrams: row.fatGrams,
            daysLogged: row.daysLogged,
          })),
        },
      };
    }

    const report = await this.reportsLogic.getDailyReport(userId, {
      ...range,
      page: 1,
      pageSize: MAX_DAILY_ROWS,
    });

    return {
      result: {
        range: { from, to },

        truncatedTo: report.meta.totalItems > MAX_DAILY_ROWS ? MAX_DAILY_ROWS : undefined,
        days: report.data.map((row) => ({
          date: row.date,
          calories: row.calories,
          proteinGrams: row.proteinGrams,
          carbGrams: row.carbGrams,
          fatGrams: row.fatGrams,
          entryCount: row.entryCount,
          goalCalories: row.goal?.dailyCalories ?? null,
          caloriesRemaining: row.caloriesRemaining,
        })),
      },
    };
  }
}
