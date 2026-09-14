'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/components/ui';
import { formatCalories, formatGrams } from '@/lib/format';

interface GoalProgressProps {
  target: { dailyCalories: number; proteinGrams: number; carbGrams: number; fatGrams: number };
  actual: { calories: number; proteinGrams: number; carbGrams: number; fatGrams: number };
}

export function GoalProgress({ target, actual }: GoalProgressProps) {
  const reduce = Boolean(useReducedMotion());
  const calRatio = target.dailyCalories > 0 ? actual.calories / target.dailyCalories : 0;
  const fill = Math.min(1, Math.max(0, calRatio));
  const over = calRatio > 1;
  const leftover = target.dailyCalories - actual.calories;

  const macros = [
    { label: 'Protein', actual: actual.proteinGrams, target: target.proteinGrams, accent: 'var(--protein)', format: formatGrams },
    { label: 'Carbs', actual: actual.carbGrams, target: target.carbGrams, accent: 'var(--carbs)', format: formatGrams },
    { label: 'Fat', actual: actual.fatGrams, target: target.fatGrams, accent: 'var(--fat)', format: formatGrams },
  ];

  const ratios = macros.map((col) => (col.target > 0 ? col.actual / col.target : 0));
  const scale = Math.max(1, ...ratios);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
      <div className="min-w-0">
        <p className="kicker">Today vs goal</p>
        <p className="mt-1 text-sm text-muted">
          {over
            ? `${formatCalories(Math.abs(leftover))} kcal over your daily goal`
            : `${formatCalories(Math.max(0, leftover))} kcal left today`}
        </p>

        <div className="mt-5 overflow-hidden rounded-md bg-foreground text-on-accent">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-5 pt-5">
            <div className="min-w-0">
              <p className="text-xs text-on-accent/60">Logged today</p>
              <p className="mt-1 font-display text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
                {formatCalories(actual.calories)}
              </p>
            </div>
            <p className="pb-1 text-sm tabular-nums text-on-accent/70">
              of {formatCalories(target.dailyCalories)} kcal
            </p>
          </div>
          <div className="mx-5 mt-5 h-2 overflow-hidden rounded-sm bg-white/15">
            <motion.div
              className={cx('h-full rounded-sm', over ? 'bg-danger' : 'bg-[#e8b86d]')}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${Math.min(100, fill * 100)}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 24 }}
            />
          </div>
          <p className="px-5 py-3 text-xs tabular-nums text-on-accent/55">
            {Math.round(calRatio * 100)}% of today's goal
          </p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
        <div className="relative z-10 border-b border-border bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Macro fill</p>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 pb-4 pt-4">
          {macros.map((col, index) => {
            const ratio = ratios[index];
            const past = ratio > 1;
            const barShare = scale > 0 ? Math.min(100, (ratio / scale) * 100) : 0;

            return (
              <div key={col.label} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end overflow-hidden rounded-sm bg-surface-raised">
                  <motion.span
                    initial={reduce ? false : { height: '8%' }}
                    animate={{ height: `${Math.max(8, barShare)}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-full rounded-sm"
                    style={{ background: past ? 'var(--danger)' : col.accent }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium leading-tight">{col.label}</p>
                  <p
                    className={cx(
                      'mt-0.5 text-[11px] tabular-nums',
                      past ? 'font-semibold text-danger' : 'text-muted',
                    )}
                  >
                    {Math.round(ratio * 100)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <ul className="space-y-1 border-t border-border px-4 py-3 text-[11px] tabular-nums text-muted">
          {macros.map((col) => (
            <li key={`${col.label}-line`} className="flex justify-between gap-2">
              <span>{col.label}</span>
              <span className="min-w-0 text-right">
                {col.format(col.actual)} / {col.format(col.target)} g
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
