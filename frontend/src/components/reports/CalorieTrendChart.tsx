'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCalories, formatDateKey, formatGrams } from '@/lib/format';
import type { DailyReportRow, WeeklyReportRow } from '@/lib/types';

const AXIS_STYLE = { fill: 'var(--subtle)', fontSize: 11 };

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 16px rgb(17 17 19 / 0.08)',
};

export type DailyMetric = 'calories' | 'proteinGrams' | 'carbGrams' | 'fatGrams';

const METRICS: { id: DailyMetric; label: string }[] = [
  { id: 'calories', label: 'Calories' },
  { id: 'proteinGrams', label: 'Protein' },
  { id: 'carbGrams', label: 'Carbs' },
  { id: 'fatGrams', label: 'Fat' },
];

function goalFor(row: DailyReportRow, metric: DailyMetric): number | null {
  if (!row.goal) return null;
  if (metric === 'calories') return row.goal.dailyCalories;
  return row.goal[metric];
}

function actualFor(row: DailyReportRow, metric: DailyMetric): number {
  if (metric === 'calories') return row.calories;
  return row[metric];
}

export function CalorieTrendChart({ rows }: { rows: DailyReportRow[] }) {
  const [metric, setMetric] = useState<DailyMetric>('calories');

  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No data for this range yet.</p>;
  }

  const isCalories = metric === 'calories';
  const unit = isCalories ? 'kcal' : 'g';
  const formatValue = (value: number) => (isCalories ? formatCalories(value) : formatGrams(value));
  const data = rows.map((row) => ({
    date: formatDateKey(row.date, rows.length <= 8 ? 'EEE' : 'd MMM'),
    logged: actualFor(row, metric),
    goal: goalFor(row, metric),
  }));
  const peak = Math.max(...data.map((row) => Math.max(row.logged, row.goal ?? 0)), 0);
  const yMax = Math.max(peak * 1.15, 100);
  const goalValue = data.find((row) => row.goal != null)?.goal ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Daily calories</h2>
          <p className="mt-0.5 text-sm text-muted">
            Bars are what you logged; the dashed line is your daily target.
          </p>
        </div>
        <label className="sr-only" htmlFor="daily-metric">
          Chart metric
        </label>
        <select
          id="daily-metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value as DailyMetric)}
          className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        >
          {METRICS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, yMax]}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-raised)' }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value, name) => [
              typeof value === 'number' ? `${formatValue(value)} ${unit}` : '—',
              name === 'logged' ? 'Logged' : 'Target',
            ]}
          />
          <Bar dataKey="logged" radius={[6, 6, 2, 2]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.date}-${index}`}
                fill="var(--accent)"
                fillOpacity={entry.logged === 0 ? 0 : 1}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="goal"
            stroke="var(--fat)"
            strokeDasharray="5 4"
            strokeWidth={1.6}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-accent" />
          {isCalories ? 'Calories logged' : `${METRICS.find((item) => item.id === metric)?.label} logged`}
        </li>
        {goalValue != null && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 border-t-2 border-dashed border-fat" />
            Daily target ({formatValue(goalValue)} {unit})
          </li>
        )}
      </ul>
    </div>
  );
}

export function WeeklyCaloriesChart({ rows }: { rows: WeeklyReportRow[] }) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No data for this range yet.</p>;
  }

  const data = rows.map((row) => ({
    week: weekLabel(row.weekStart, row.weekEnd),
    calories: row.calories,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="week" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: 'var(--surface-raised)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [
            typeof value === 'number' ? `${formatCalories(value)} kcal` : '—',
            'Week total',
          ]}
        />
        <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 2, 2]} maxBarSize={48}>
          <LabelList
            dataKey="calories"
            position="top"
            className="fill-foreground text-[11px] tabular-nums"
            formatter={(value) => formatCalories(typeof value === 'number' ? value : Number(value) || 0)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function weekLabel(start: string, end: string) {
  const from = parseISO(`${start}T00:00:00`);
  const to = parseISO(`${end}T00:00:00`);
  if (from.getMonth() === to.getMonth()) {
    return `${format(from, 'MMM d')}–${format(to, 'd')}`;
  }
  return `${format(from, 'MMM d')}–${format(to, 'MMM d')}`;
}
