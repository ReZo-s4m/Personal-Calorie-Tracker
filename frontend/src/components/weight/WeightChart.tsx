'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { daysAgoKey, formatDateKey } from '@/lib/format';
import { cx } from '@/components/ui';
import type { WeightLog } from '@/lib/types';
import { formatKg } from './formatKg';

type WeightRange = '7d' | '30d' | '3m' | '1y' | 'all';

const RANGES: { id: WeightRange; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '3m', label: '3M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

function rangeFrom(range: WeightRange): string | null {
  if (range === '7d') return daysAgoKey(6);
  if (range === '30d') return daysAgoKey(29);
  if (range === '3m') return daysAgoKey(89);
  if (range === '1y') return daysAgoKey(364);
  return null;
}

export function WeightChart({ readings }: { readings: WeightLog[] }) {
  const [range, setRange] = useState<WeightRange>('7d');
  const from = rangeFrom(range);

  const data = useMemo(() => {
    const chronological = [...readings]
      .filter((row) => (from ? row.loggedOn >= from : true))
      .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));

    return chronological.map((row) => ({
      id: row.id,
      date: formatDateKey(row.loggedOn, 'd MMM'),
      fullDate: formatDateKey(row.loggedOn, 'd MMM yyyy'),
      kg: row.kg,
    }));
  }, [readings, from]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Weight trend</h2>
        <div className="flex flex-wrap items-center gap-1">
          {RANGES.map((item) => {
            const selected = range === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                className={cx(
                  'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-foreground text-on-accent'
                    : 'text-muted hover:bg-surface-raised hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 min-h-[16rem] flex-1">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center py-16 text-sm text-muted">
            {readings.length === 0
              ? 'The line appears after the first weigh-in.'
              : 'No weigh-ins in this period.'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--subtle)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--subtle)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tickFormatter={(value: number) => formatKg(value)}
              />
              <Tooltip content={WeightTooltip} cursor={{ stroke: 'var(--border-strong)' }} />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#weightFill)"
                activeDot={{ r: 6, fill: 'var(--accent)', stroke: '#fff', strokeWidth: 2 }}
                dot={{ r: 4, fill: 'var(--accent)', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function WeightTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { fullDate?: string; kg?: number } }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point || typeof point.kg !== 'number') {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-[0_8px_24px_rgb(48_36_26/0.1)]">
      <p className="text-xs text-muted">{point.fullDate}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-semibold tabular-nums">
        <span className="size-2 rounded-full bg-accent" />
        {formatKg(point.kg)} kg
      </p>
    </div>
  );
}
