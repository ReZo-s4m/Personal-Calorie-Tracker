import type { Paginated } from '../../common/pagination.js';
import type {
  DailyReportRow,
  TargetComparison,
  MacroBreakdown,
  MicronutrientRow,
  ReportRangeQuery,
  ResolvedRange,
  WeeklyReportRow,
} from './models/reports.models.js';

type WithRange<T> = T & { range: { from: string; to: string } };

export interface IReportsLogic {
  /** Clamps and orders the window, defaulting to the last 30 days. Throws past 366 days. */
  resolveRange(query: ReportRangeQuery): ResolvedRange;

  /** Every day in the range, zero-filled, each against the goal in force that day. */
  getDailyReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<WithRange<Paginated<DailyReportRow>>>;

  getWeeklyReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<WithRange<Paginated<WeeklyReportRow>>>;

  getMicronutrientReport(
    userId: string,
    query: ReportRangeQuery,
  ): Promise<WithRange<Paginated<MicronutrientRow>> & { days: number }>;

  getTargetComparison(userId: string, query: ReportRangeQuery): Promise<TargetComparison>;

  getMacroBreakdown(userId: string, query: ReportRangeQuery): Promise<WithRange<MacroBreakdown>>;
}
