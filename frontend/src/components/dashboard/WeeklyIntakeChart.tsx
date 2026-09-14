'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCalories, formatDateKey } from '@/lib/format';
import type { DailyReportRow } from '@/lib/types';

const BAR = '#9a3412';
const BAR_PEAK = '#c2410c';
const AVERAGE = '#c4a484';

function toChartRows(rows: DailyReportRow[]) {
  const fallbackGoal = rows.find((row) => row.goal?.dailyCalories)?.goal?.dailyCalories ?? null;

  return rows.map((row) => ({
    date: row.date,
    day: formatDateKey(row.date, 'EEE'),
    calories: Math.round(row.calories),
    target: row.goal?.dailyCalories ?? fallbackGoal,
    logged: row.calories > 0,
  }));
}

type ChartRow = ReturnType<typeof toChartRows>[number];

function TipCard({ row }: { row: ChartRow }) {
  return (
    <div className="rounded-md border border-border-strong bg-foreground px-3 py-2.5 text-[#f7f1e8] shadow-[0_12px_28px_rgb(26_22_20/0.28)] whitespace-nowrap">
      <p className="font-display text-sm italic text-[#e8b86d]">{formatDateKey(row.date, 'EEE d MMM')}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatCalories(row.calories)} kcal</p>
      {row.target != null && (
        <p className="mt-0.5 text-[11px] text-[#f7f1e8]/60">
          {formatCalories(row.target)} kcal target
          {row.target > 0 ? ` · ${Math.round((row.calories / row.target) * 100)}%` : ''}
        </p>
      )}
    </div>
  );
}

function WeekPlot({
  data,
  peakDate,
  average,
  yMax,
  showAverageLine,
}: {
  data: ChartRow[];
  peakDate: string;
  average: number;
  yMax: number;
  showAverageLine: boolean;
}) {
  const [pin, setPin] = useState<{ row: ChartRow; x: number; y: number } | null>(null);

  return (
    <div className="relative mt-4 h-[220px] w-full px-1 sm:px-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
          onMouseMove={(state) => {
            if (
              !state?.isTooltipActive ||
              state.activeTooltipIndex == null ||
              !state.activeCoordinate
            ) {
              setPin(null);
              return;
            }
            const row = data[Number(state.activeTooltipIndex)];
            if (!row) {
              setPin(null);
              return;
            }
            setPin({
              row,
              x: state.activeCoordinate.x,
              y: state.activeCoordinate.y,
            });
          }}
          onMouseLeave={() => setPin(null)}
        >
          <CartesianGrid vertical={false} stroke="rgba(48, 36, 26, 0.1)" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--subtle)', fontSize: 11 }}
            interval={0}
          />
          <YAxis axisLine={false} tickLine={false} tick={false} width={12} domain={[0, yMax]} />
          <Tooltip cursor={{ fill: 'rgba(154, 52, 18, 0.08)' }} content={() => null} />
          {showAverageLine && (
            <ReferenceLine y={average} stroke={AVERAGE} strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <Bar dataKey="calories" radius={[3, 3, 0, 0]} maxBarSize={36} minPointSize={6}>
            {data.map((row) => (
              <Cell
                key={row.date}
                fill={row.date === peakDate ? BAR_PEAK : BAR}
                fillOpacity={row.logged ? 1 : 0.22}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      {pin && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: pin.x,
            top: pin.y,
            transform:
              pin.x > 170
                ? 'translate(-100%, calc(-100% - 8px))'
                : 'translate(-50%, calc(-100% - 8px))',
          }}
        >
          <TipCard row={pin.row} />
        </div>
      )}
    </div>
  );
}

export function WeeklyIntakeChart({ rows }: { rows: DailyReportRow[] }) {
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  if (ordered.length === 0) {
    return (
      <div className="app-panel p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">Last 7 days</h2>
        <p className="mt-8 py-8 text-center text-sm text-muted">No data for this range yet.</p>
      </div>
    );
  }

  const data = toChartRows(ordered);
  const total = data.reduce((sum, row) => sum + row.calories, 0);
  const average = Math.round(total / data.length);
  const peak = data.reduce((best, row) => (row.calories > best.calories ? row : best));
  const daysLogged = data.filter((row) => row.logged).length;
  const target = data.find((row) => row.target != null)?.target ?? null;
  const maxLogged = Math.max(...data.map((row) => row.calories), 1);
  const yMax = Math.max(Math.ceil(maxLogged * 1.35), 8);
  const showAverageLine = average > 0 && average <= yMax;
  const midpoint = Math.floor(data.length / 2);
  const earlier = data.slice(0, Math.max(midpoint, 1));
  const later = data.slice(Math.max(midpoint, 1));
  const earlierAvg = earlier.reduce((sum, row) => sum + row.calories, 0) / earlier.length;
  const laterAvg = later.length
    ? later.reduce((sum, row) => sum + row.calories, 0) / later.length
    : earlierAvg;
  const rising = laterAvg >= earlierAvg;

  return (
    <div className="flex w-full flex-col rounded-md bg-surface ring-1 ring-border">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <p className="kicker">This week</p>
          <h3 className="mt-1 text-2xl tracking-tight">Last 7 days</h3>
        </div>
        {target != null && (
          <p className="rounded-sm border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted">
            Goal {formatCalories(target)} kcal
          </p>
        )}
      </header>

      <WeekPlot
        data={data}
        peakDate={peak.date}
        average={average}
        yMax={yMax}
        showAverageLine={showAverageLine}
      />

      <p className="px-5 text-[11px] text-subtle sm:px-6">
        Hover a bar for that day's kcal. The height follows what you logged, so quiet days stay visible.
      </p>

      <div className="mt-4 flex flex-col gap-px overflow-hidden border-t border-border bg-border">
        <article className="ink-panel flex items-end justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#ebe4d8]/50">Loudest day</p>
            <p className="mt-2 font-display text-3xl font-medium tracking-tight tabular-nums">
              {formatCalories(peak.calories)}
              <span className="ml-1 text-sm font-sans font-normal text-[#ebe4d8]/55">kcal</span>
            </p>
          </div>
          <p className="font-display text-base italic text-[#e8b86d]">{formatDateKey(peak.date, 'EEEE')}</p>
        </article>

        <article className="bg-surface p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Daily average</p>
              <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums">{formatCalories(average)}</p>
            </div>
            <p className={rising ? 'text-xs font-medium text-accent' : 'text-xs font-medium text-danger'}>
              {rising ? 'Rising' : 'Easing'}
            </p>
          </div>
          {target != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.round((average / Math.max(target, 1)) * 100))}%` }}
              />
            </div>
          )}
        </article>

        <article className="bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Days on the tape</p>
            <p className="text-sm font-semibold tabular-nums">
              {daysLogged}/{data.length}
            </p>
          </div>
          <ol className="flex gap-1.5">
            {data.map((row) => (
              <li key={row.date} className="min-w-0 flex-1">
                <motion.span
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  className="block h-9 origin-bottom rounded-sm"
                  style={{
                    background: row.logged
                      ? row.date === peak.date
                        ? BAR_PEAK
                        : BAR
                      : 'var(--surface-raised)',
                  }}
                  title={`${row.day}: ${formatCalories(row.calories)} kcal`}
                />
                <p className="mt-1 text-center text-[10px] text-subtle">{row.day.slice(0, 1)}</p>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}
