'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, isPhotoExtractAvailable } from '@/lib/api-client';
import { useAsync } from '@/hooks/useAsync';
import { formatCalories, todayKey } from '@/lib/format';
import { Alert, Button, Skeleton } from '@/components/ui';
import { LogMealComposer } from '@/components/entries/LogMealComposer';
import type { FoodEntry } from '@/lib/types';

export default function LogMealPage() {
  const today = todayKey();
  const [justLogged, setJustLogged] = useState<FoodEntry[]>([]);

  const aiStatus = useAsync(() => api.ai.status(), []);
  const todayTotals = useAsync(
    () => api.entries.list({ from: today, to: today, pageSize: 1 }),
    [today, justLogged.length],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">Kitchen</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Add Meal</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Enter the meal, or scan a photo and confirm the numbers.
          </p>
        </div>
        {todayTotals.data && (
          <div className="rounded-md border border-border bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">Logged today</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCalories(todayTotals.data.totals.calories)}
              <span className="ml-1 text-xs font-medium text-muted">kcal</span>
            </p>
          </div>
        )}
      </header>

      {aiStatus.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <LogMealComposer
          isAiAvailable={isPhotoExtractAvailable(aiStatus.data)}
          recentRevision={justLogged.length}
          onSaved={(entries) => setJustLogged((current) => [...entries, ...current])}
        />
      )}

      {justLogged.length > 0 && (
        <Alert tone="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Saved. Keep going or review the day.</span>
            <Link href="/dashboard">
              <Button variant="secondary" className="px-2 py-1 text-xs">
                View overview
              </Button>
            </Link>
          </div>
        </Alert>
      )}
    </div>
  );
}
