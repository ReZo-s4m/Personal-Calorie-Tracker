'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { useAsync } from '@/hooks/useAsync';
import { formatDateKey, todayKey } from '@/lib/format';
import { Alert, EmptyState, Pagination, Skeleton } from '@/components/ui';
import { GoalComposer } from '@/components/goals/GoalComposer';
import { GoalHistory } from '@/components/goals/GoalHistory';
import { GoalProgress } from '@/components/goals/GoalProgress';
import { useGoalsMotion } from '@/components/goals/useGoalsMotion';
import { useDataRevision } from '@/lib/data-sync';

const HISTORY_PAGE_SIZE = 5;

export default function GoalsPage() {
  const today = todayKey();
  const dataRevision = useDataRevision();
  const rootRef = useRef<HTMLDivElement>(null);
  useGoalsMotion(rootRef);

  const [historyPage, setHistoryPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const current = useAsync(() => api.goals.current(today), [today, revision, dataRevision]);
  const todayTotals = useAsync(
    () => api.entries.list({ from: today, to: today, pageSize: 1 }),
    [today, revision, dataRevision],
  );
  const history = useAsync(
    () => api.goals.history({ page: historyPage, pageSize: HISTORY_PAGE_SIZE }),
    [historyPage, revision, dataRevision],
  );

  const goal = current.data?.goal ?? null;

  function refreshAll() {
    setHistoryPage(1);
    setRevision((value) => value + 1);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);

    try {
      await api.goals.remove(id);
      setNotice('That target version was deleted.');
      refreshAll();
    } catch (caught) {
      setDeleteError(errorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-5">
      {notice && !deleteError && <Alert tone="info">{notice}</Alert>}

      {current.isLoading && !current.data ? (
        <Skeleton className="h-[32rem] w-full" />
      ) : (
        <div data-goals="compose">
          <GoalComposer
            key={goal?.id ?? 'new'}
            currentGoal={goal}
            todayCalories={todayTotals.data?.totals.calories ?? null}
            onSaved={(saved) => {
              setNotice(`Targets saved, effective from ${formatDateKey(saved.effectiveFrom)}.`);
              refreshAll();
            }}
          />
        </div>
      )}

      <section
        data-goals="today"
        className="rounded-md border border-border bg-surface px-5 py-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:px-6"
      >
        {(current.isLoading && !current.data) || (todayTotals.isLoading && !todayTotals.data) ? (
          <Skeleton className="h-12 w-full" />
        ) : !goal ? (
          <EmptyState
            title="No goals yet"
            description="Save a calorie and macro target first. Today's meals will show against it."
          />
        ) : (
          <GoalProgress
            target={goal}
            actual={
              todayTotals.data?.totals ?? {
                calories: 0,
                proteinGrams: 0,
                carbGrams: 0,
                fatGrams: 0,
              }
            }
          />
        )}
      </section>

      <section data-goals="history" className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Editions on file</h2>
            <p className="mt-0.5 text-sm text-muted">Every save writes a dated version. The newest in-range one stays in force.</p>
          </div>
          {history.data && history.data.meta.totalItems > 0 && (
            <span className="text-xs text-subtle">
              {history.data.meta.totalItems}{' '}
              {history.data.meta.totalItems === 1 ? 'version' : 'versions'}
            </span>
          )}
        </div>

        {deleteError && <Alert>{deleteError}</Alert>}
        {history.error && <Alert>{history.error}</Alert>}

        {history.isLoading && !history.data ? (
          <Skeleton className="h-16 w-full" />
        ) : !history.data || history.data.data.length === 0 ? (
          <EmptyState
            title="Nothing on file"
            description="Each save writes a dated edition here. Until then the shelf stays empty."
          />
        ) : (
          <>
            <GoalHistory
              goals={history.data.data}
              currentGoalId={goal?.id ?? null}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
            <Pagination {...history.data.meta} onPageChange={setHistoryPage} />
          </>
        )}
      </section>
    </div>
  );
}
