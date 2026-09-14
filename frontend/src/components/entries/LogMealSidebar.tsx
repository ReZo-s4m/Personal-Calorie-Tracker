'use client';

import Link from 'next/link';
import { formatCalories, formatTime } from '@/lib/format';
import { cx } from '@/components/ui';
import type { FoodEntry } from '@/lib/types';

export function LogMealSidebar({
  calories,
  proteinGrams,
  carbGrams,
  fatGrams,
  recent,
  isRecentLoading,
  onReuse,
}: {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  recent: FoodEntry[];
  isRecentLoading?: boolean;
  onReuse?: (entry: FoodEntry) => void;
}) {
  const macros = [
    { label: 'Protein', value: proteinGrams, color: 'var(--protein)' },
    { label: 'Carbs', value: carbGrams, color: 'var(--carbs)' },
    { label: 'Fat', value: fatGrams, color: 'var(--fat)' },
  ];
  const totalGrams = macros.reduce((sum, item) => sum + item.value, 0);
  const hasPreview = calories > 0 || totalGrams > 0;

  return (
    <>
      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="ink-panel px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">This meal</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums leading-none">
            {formatCalories(calories)}
            <span className="ml-1.5 text-sm font-medium text-white/50">kcal</span>
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          {macros.map((item) => (
            <div key={item.label} className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{item.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{Math.round(item.value)}g</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${totalGrams > 0 ? Math.max(8, (item.value / totalGrams) * 100) : 0}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {!hasPreview && (
          <p className="border-t border-border px-5 py-3 text-xs text-muted">
            Numbers appear here as you type or scan.
          </p>
        )}
      </section>

      <section className="rounded-md border border-border bg-surface p-5">
        <header className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Reuse</p>
          <Link href="/entries" className="text-xs font-medium text-accent hover:text-accent-hover">
            Food log
          </Link>
        </header>
        {isRecentLoading ? (
          <p className="py-3 text-xs text-muted">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="py-3 text-xs text-muted">Saved meals will show up here for a one-tap refill.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onReuse?.(entry)}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left',
                    'bg-surface-raised/70 transition-colors hover:bg-surface-raised',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{entry.foodName}</span>
                    <span className="text-[11px] text-subtle">{formatTime(entry.consumedAt)}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {formatCalories(entry.calories)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
