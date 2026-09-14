'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { formatCalories, formatGrams } from '@/lib/format';
import type { GoalComparison } from '@/lib/types';

const TARGET_COLOR = 'var(--fat)';
const LOGGED_COLOR = 'var(--accent)';

interface MetricRow {
  key: string;
  label: string;
  logged: number;
  goal: number;
  percent: number;
  actualText: string;
  targetText: string;
  accent: string;
}

function daysCovered(comparison: GoalComparison): number {
  if (!comparison.hasGoal || comparison.target.averageDailyCalories <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(comparison.target.calories / comparison.target.averageDailyCalories));
}

function dailyAverages(comparison: GoalComparison) {
  const loggedDays = Math.max(1, comparison.daysLogged);
  const goalDays = daysCovered(comparison) || comparison.range.days || 1;

  return {
    calories: comparison.actual.averageDailyCalories,
    proteinGrams: comparison.actual.proteinGrams / loggedDays,
    carbGrams: comparison.actual.carbGrams / loggedDays,
    fatGrams: comparison.actual.fatGrams / loggedDays,
    targetCalories: comparison.target.averageDailyCalories,
    targetProtein: comparison.target.proteinGrams / goalDays,
    targetCarbs: comparison.target.carbGrams / goalDays,
    targetFat: comparison.target.fatGrams / goalDays,
  };
}

function percent(actual: number, target: number) {
  if (!(target > 0)) return 0;
  return Math.round((actual / target) * 100);
}

function metricsFrom(comparison: GoalComparison): MetricRow[] {
  const avg = dailyAverages(comparison);
  const caloriesPct = percent(avg.calories, avg.targetCalories);
  const proteinPct = percent(avg.proteinGrams, avg.targetProtein);
  const carbPct = percent(avg.carbGrams, avg.targetCarbs);
  const fatPct = percent(avg.fatGrams, avg.targetFat);
  const overall = Math.round((caloriesPct + proteinPct + carbPct + fatPct) / 4);

  return [
    {
      key: 'calories',
      label: 'Calories',
      logged: Math.min(caloriesPct, 120),
      goal: 100,
      percent: caloriesPct,
      actualText: `${formatCalories(avg.calories)} kcal`,
      targetText: `${formatCalories(avg.targetCalories)} kcal`,
      accent: 'var(--accent)',
    },
    {
      key: 'protein',
      label: 'Protein',
      logged: Math.min(proteinPct, 120),
      goal: 100,
      percent: proteinPct,
      actualText: `${formatGrams(avg.proteinGrams)} g`,
      targetText: `${formatGrams(avg.targetProtein)} g`,
      accent: 'var(--protein)',
    },
    {
      key: 'fat',
      label: 'Fat',
      logged: Math.min(fatPct, 120),
      goal: 100,
      percent: fatPct,
      actualText: `${formatGrams(avg.fatGrams)} g`,
      targetText: `${formatGrams(avg.targetFat)} g`,
      accent: 'var(--fat)',
    },
    {
      key: 'carbs',
      label: 'Carbs',
      logged: Math.min(carbPct, 120),
      goal: 100,
      percent: carbPct,
      actualText: `${formatGrams(avg.carbGrams)} g`,
      targetText: `${formatGrams(avg.targetCarbs)} g`,
      accent: 'var(--carbs)',
    },
    {
      key: 'overall',
      label: 'Overall',
      logged: Math.min(overall, 120),
      goal: 100,
      percent: overall,
      actualText: `${overall}%`,
      targetText: '100%',
      accent: 'var(--foreground)',
    },
  ];
}

export function GoalComparisonChart({ comparison }: { comparison: GoalComparison }) {
  if (!comparison.hasGoal || !comparison.adherence) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        No goal covered this range, so there is nothing to compare against.
      </p>
    );
  }

  const metrics = metricsFrom(comparison);
  const tableRows = metrics.filter((row) => row.key !== 'overall');

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <div>
        <div className="h-[280px] w-full sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={metrics} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="var(--border-strong)" strokeWidth={1} gridType="polygon" />
              <PolarAngleAxis
                dataKey="label"
                tick={(props) => (
                  <AxisTick
                    x={typeof props.x === 'number' ? props.x : Number(props.x)}
                    y={typeof props.y === 'number' ? props.y : Number(props.y)}
                    payload={props.payload}
                    textAnchor={
                      props.textAnchor === 'start' || props.textAnchor === 'end' || props.textAnchor === 'middle'
                        ? props.textAnchor
                        : 'middle'
                    }
                    metrics={metrics}
                  />
                )}
                tickLine={false}
              />
              <Radar
                name="Target"
                dataKey="goal"
                stroke={TARGET_COLOR}
                fill={TARGET_COLOR}
                fillOpacity={0.08}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Radar
                name="Logged"
                dataKey="logged"
                stroke={LOGGED_COLOR}
                fill={LOGGED_COLOR}
                fillOpacity={0.28}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px] bg-accent/70" />
            Logged
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px] bg-fat/70" />
            Target (100%)
          </li>
        </ul>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-2.5 font-medium">Metric</th>
            <th className="pb-2.5 font-medium">Logged (avg/day)</th>
            <th className="pb-2.5 font-medium">Target</th>
            <th className="pb-2.5 font-medium">% of target</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((metric) => (
            <tr key={metric.key} className="border-b border-border last:border-0">
              <td className="py-3 font-medium">{metric.label}</td>
              <td className="py-3 tabular-nums text-muted">{metric.actualText}</td>
              <td className="py-3 tabular-nums text-muted">{metric.targetText}</td>
              <td className="py-3">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: metric.accent }} />
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden bg-surface-raised">
                    <span
                      className="block h-full"
                      style={{
                        width: `${Math.min(100, metric.percent)}%`,
                        background: metric.accent,
                      }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums">{metric.percent}%</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AxisTick({
  x,
  y,
  payload,
  metrics,
  textAnchor,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  metrics: MetricRow[];
  textAnchor?: 'start' | 'middle' | 'end';
}) {
  const metric = metrics.find((row) => row.label === payload?.value);
  if (typeof x !== 'number' || typeof y !== 'number' || !metric) {
    return null;
  }

  return (
    <text x={x} y={y} textAnchor={textAnchor ?? 'middle'} fill="var(--foreground)" fontSize={11}>
      <tspan x={x} dy="-4" fontWeight={600}>
        {metric.label}
      </tspan>
      <tspan x={x} dy="14" fill="var(--subtle)" fontSize={10}>
        {metric.targetText}
      </tspan>
    </text>
  );
}
