'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Badge, Button, cx } from '@/components/ui';
import { formatCalories, formatDateKey, formatGrams } from '@/lib/format';
import type { Goal } from '@/lib/types';

export function GoalHistory({
  goals,
  currentGoalId,
  deletingId,
  onDelete,
}: {
  goals: Goal[];
  currentGoalId: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  const reduce = Boolean(useReducedMotion());

  return (
    <ol className="relative flex flex-col gap-4 pl-2">
      <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px bg-border" />
      {goals.map((entry, index) => {
        const active = entry.id === currentGoalId;
        const proteinPct = share(entry.proteinGrams, 4, entry.dailyCalories);
        const carbPct = share(entry.carbGrams, 4, entry.dailyCalories);
        const fatPct = share(entry.fatGrams, 9, entry.dailyCalories);

        return (
          <motion.li
            key={entry.id}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3"
          >
            <span
              className={cx(
                'relative z-[1] mt-5 size-3 rounded-full border-2',
                active ? 'border-accent bg-accent' : 'border-border-strong bg-surface',
              )}
            />
            <article
              className={cx(
                'rounded-md border px-4 py-4 sm:px-5',
                active ? 'border-foreground bg-surface-raised' : 'border-border bg-surface',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-subtle">
                    Edition {formatDateKey(entry.effectiveFrom, 'd MMM yyyy')}
                  </p>
                  <p className="mt-1 font-display text-2xl font-medium tracking-tight tabular-nums">
                    {formatCalories(entry.dailyCalories)}
                    <span className="ml-1 text-sm font-sans font-normal text-muted">kcal</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {active && <Badge tone="accent">In force</Badge>}
                  <Button
                    variant="danger"
                    className="px-3 py-1 text-xs"
                    isLoading={deletingId === entry.id}
                    onClick={() => onDelete(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-surface-raised">
                <div className="flex h-full">
                  <span className="h-full bg-protein" style={{ width: `${proteinPct}%` }} />
                  <span className="h-full bg-carbs" style={{ width: `${carbPct}%` }} />
                  <span className="h-full bg-fat" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
              <p className="mt-2 text-xs tabular-nums text-muted">
                {formatGrams(entry.proteinGrams)}g protein · {formatGrams(entry.carbGrams)}g carbs ·{' '}
                {formatGrams(entry.fatGrams)}g fat
                {entry.targetWeightKg != null ? ` · ${entry.targetWeightKg} kg mark` : ''}
              </p>
            </article>
          </motion.li>
        );
      })}
    </ol>
  );
}

function share(grams: number, kcalPerGram: number, calories: number) {
  if (!(calories > 0) || !(grams > 0)) {
    return 0;
  }
  return Math.round(((grams * kcalPerGram) / calories) * 100);
}
