'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import { useAsync } from '@/hooks/useAsync';
import { formatCalories } from '@/lib/format';
import { Alert, Button, Pagination, Skeleton, cx } from '@/components/ui';
import { CalorieTrendChart, WeeklyCaloriesChart } from '@/components/reports/CalorieTrendChart';
import { DownloadReportButton } from '@/components/reports/DownloadReportButton';
import { GoalComparisonChart } from '@/components/reports/GoalComparisonChart';
import { KeyTakeaways } from '@/components/reports/KeyTakeaways';
import { MacroBreakdownChart } from '@/components/reports/MacroBreakdownChart';
import { MicronutrientTable } from '@/components/reports/MicronutrientTable';
import {
  defaultRange,
  previousWindow,
  presetSpanLabel,
  queryRange,
  rangeDays,
  ReportRangePicker,
  type DateRange,
} from '@/components/reports/ReportRangePicker';
import { useDataRevision } from '@/lib/data-sync';
import type { GoalComparison } from '@/lib/types';

const MAX_ROWS_PER_PAGE = 100;
const MICRONUTRIENTS_PER_PAGE = 8;

function rangeWarning(range: DateRange): string | null {
  if (!range.from || !range.to) {
    return 'Enter both a start and an end date. Until then the reports stay on the last 30 days.';
  }

  return rangeDays(range) === null ? 'Those dates could not be read.' : null;
}

export default function ReportsPage() {
  const dataRevision = useDataRevision();
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [microPage, setMicroPage] = useState(1);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const days = rangeDays(range);
  const warning = rangeWarning(range);
  const dailyPageSize = Math.min(days ?? 30, MAX_ROWS_PER_PAGE);
  const weeklyPageSize = Math.min(Math.ceil((days ?? 30) / 7) + 1, MAX_ROWS_PER_PAGE);
  const dates = queryRange(range);
  const previousDates = previousWindow(range);

  const daily = useAsync(
    () => api.reports.daily({ ...dates, pageSize: dailyPageSize }),
    [dates.from, dates.to, dailyPageSize, dataRevision],
  );
  const weekly = useAsync(
    () => api.reports.weekly({ ...dates, pageSize: weeklyPageSize }),
    [dates.from, dates.to, weeklyPageSize, dataRevision],
  );
  const macros = useAsync(() => api.reports.macros(dates), [dates.from, dates.to, dataRevision]);
  const comparison = useAsync(
    () => api.reports.goalComparison(dates),
    [dates.from, dates.to, dataRevision],
  );
  const previous = useAsync(
    () =>
      previousDates
        ? api.reports.goalComparison(previousDates)
        : Promise.resolve(null as GoalComparison | null),
    [previousDates?.from, previousDates?.to, dataRevision],
  );
  const micronutrients = useAsync(
    () =>
      api.reports.micronutrients({
        ...dates,
        page: microPage,
        pageSize: MICRONUTRIENTS_PER_PAGE,
      }),
    [dates.from, dates.to, microPage, dataRevision],
  );

  function applyRange(next: DateRange) {
    setRange(next);
    setMicroPage(1);
    setDownloadError(null);
  }

  const error = daily.error ?? weekly.error ?? macros.error ?? comparison.error;
  const trendRows = [...(daily.data?.data ?? [])].reverse();
  const weeklyRows = [...(weekly.data?.data ?? [])].reverse();

  return (
    <div className="flex flex-col gap-5">
      <header className="page-masthead">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Insights</p>
            <h1 className="mt-1 text-[1.75rem] font-medium tracking-tight sm:text-3xl">Insights</h1>
            <p className="mt-1 max-w-lg text-sm text-muted">
              Daily bars, weekly totals, and goal comparison from the same meal table.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadReportButton
              range={range}
              isDisabled={warning !== null}
              onError={setDownloadError}
            />
            <Link href="/log">
              <Button>Log a meal</Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-5">
          <ReportRangePicker value={range} onChange={applyRange} />
        </div>
      </header>

      {warning ? (
        <Alert tone="warning">{warning}</Alert>
      ) : (
        (downloadError ?? error) && <Alert>{downloadError ?? error}</Alert>
      )}

      <SummaryTiles
        comparison={comparison.data}
        previous={previous.data}
        range={range}
        isLoading={comparison.isLoading}
      />

      <section className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        {daily.isLoading && !daily.data ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <CalorieTrendChart rows={trendRows} />
        )}
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,20rem)]">
        <div className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
          <h2 className="text-base font-semibold">Macro split</h2>
          <p className="mt-0.5 mb-5 text-sm text-muted">Share of total calories in this range.</p>
          {macros.isLoading && !macros.data ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            macros.data && (
              <MacroBreakdownChart
                breakdown={macros.data}
                totalCalories={comparison.data?.actual.calories}
              />
            )
          )}
        </div>
        {macros.isLoading && !macros.data ? (
          <Skeleton className="h-full min-h-52" />
        ) : (
          <KeyTakeaways
            breakdown={macros.data}
            comparison={comparison.data}
            previous={previous.data}
            range={range}
          />
        )}
      </section>

      <section className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        <h2 className="text-base font-semibold">Goal vs actual</h2>
        <p className="mt-0.5 mb-5 text-sm text-muted">Compare your average meals with your goals.</p>
        {comparison.isLoading && !comparison.data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          comparison.data && <GoalComparisonChart comparison={comparison.data} />
        )}
      </section>

      <section className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        <h2 className="text-base font-semibold">Weekly totals</h2>
        <p className="mt-0.5 mb-5 text-sm text-muted">Total calories logged each week.</p>
        {weekly.isLoading && !weekly.data ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <WeeklyCaloriesChart rows={weeklyRows} />
        )}
      </section>

      <section className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        <h2 className="text-base font-semibold">Micronutrients</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted">Key micronutrients tracked in this range.</p>
        {micronutrients.isLoading && !micronutrients.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          micronutrients.data && (
            <>
              <MicronutrientTable
                rows={micronutrients.data.data}
                days={micronutrients.data.days}
              />
              <Pagination {...micronutrients.data.meta} onPageChange={setMicroPage} />
            </>
          )
        )}
      </section>

      <aside className="border-t-2 border-foreground pt-4">
        <p className="max-w-xl font-display text-base italic text-muted">
          Figures on this page match the meals, goals and weigh-ins already saved — nothing is inferred.
        </p>
      </aside>
    </div>
  );
}

function SummaryTiles({
  comparison,
  previous,
  range,
  isLoading,
}: {
  comparison: GoalComparison | null;
  previous: GoalComparison | null;
  range: DateRange;
  isLoading: boolean;
}) {
  if (isLoading && !comparison) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[7.5rem] w-full" />
        ))}
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const span = presetSpanLabel(range);
  const dailyGoal = comparison.target.averageDailyCalories;
  const dailyAvg = comparison.actual.averageDailyCalories;
  const ofGoal = dailyGoal > 0 ? Math.round((dailyAvg / dailyGoal) * 100) : null;
  const loggedRatio =
    comparison.range.days > 0 ? comparison.daysLogged / comparison.range.days : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<FlameIcon />}
        iconClass="bg-accent-soft text-accent"
        label="Total calories logged"
        value={`${formatCalories(comparison.actual.calories)} kcal`}
        hint={
          ofGoal != null && dailyGoal > 0
            ? `${ofGoal}% of ${formatCalories(dailyGoal)} kcal goal`
            : 'No calorie goal in this range'
        }
        delta={deltaLine(comparison.actual.calories, previous?.actual.calories, span)}
      />
      <StatCard
        icon={<UtensilsIcon />}
        iconClass="bg-blue-50 text-protein"
        label="Days logged"
        value={`${comparison.daysLogged} of ${comparison.range.days}`}
        hint={
          loggedRatio < 0.25
            ? 'Keep going! Try to log consistently.'
            : loggedRatio < 0.6
              ? 'Nice start. A few more days will fill this in.'
              : 'Great consistency this range.'
        }
      />
      <StatCard
        icon={<TargetIcon />}
        iconClass="bg-orange-50 text-carbs"
        label="Daily average"
        value={`${formatCalories(dailyAvg)} kcal`}
        delta={deltaLine(
          comparison.actual.averageDailyCalories,
          previous?.actual.averageDailyCalories,
          span,
        )}
      />
      <StatCard
        icon={<BarsIcon />}
        iconClass="bg-violet-50 text-violet-600"
        label="Goal progress"
        value={ofGoal != null ? `${ofGoal}%` : '—'}
        hint={ofGoal != null ? 'for this range' : 'Set a goal to track progress'}
      />
    </div>
  );
}

function deltaLine(current: number, previous: number | undefined, span: string) {
  if (previous == null || previous <= 0) {
    return null;
  }

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { text: `Same as previous ${span}`, up: false, flat: true };
  }

  return {
    text: `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs previous ${span}`,
    up: pct > 0,
    flat: false,
  };
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  hint,
  delta,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  hint?: string;
  delta?: { text: string; up: boolean; flat: boolean } | null;
}) {
  return (
    <article className="rounded-md border border-border bg-surface px-5 py-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{label}</p>
        <span className={cx('grid size-9 place-items-center rounded-sm', iconClass)}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {delta && (
        <p className={cx('mt-1 text-xs font-medium', delta.flat ? 'text-muted' : delta.up ? 'text-accent' : 'text-danger')}>
          {delta.text}
        </p>
      )}
    </article>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path
        d="M10 3s2.5 2.8 2.5 5.4c0 1.3-.6 2.5-1.5 3.4 1.8-.2 3.5 1.2 3.5 3.3 0 2.1-1.8 3.9-4.5 3.9S5.5 17.2 5.5 15.1c0-1.8 1.1-3.2 2.2-4.3C6.8 9.6 8 8 8 5.8 8 4.6 8 3 10 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path d="M6 3v6M4.5 3v6M7.5 3v6M6 9v8M13 3c1.7 0 2.5 1.6 2.5 3.5S14.7 10 13 10V3Zm0 7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path d="M4 15V9M10 15V5M16 15v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
