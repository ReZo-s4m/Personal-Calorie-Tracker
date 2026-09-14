'use client';

import { useState, type ReactNode } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { api } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { useAsync } from '@/hooks/useAsync';
import { formatDateKey, todayKey } from '@/lib/format';
import { Alert, EmptyState, Pagination, Skeleton } from '@/components/ui';
import { WeightChart } from '@/components/weight/WeightChart';
import { WeightComposer } from '@/components/weight/WeightComposer';
import { WeightHistory } from '@/components/weight/WeightHistory';
import { formatDeltaKg, formatKg } from '@/components/weight/formatKg';
import { useDataRevision } from '@/lib/data-sync';
import type { WeightLog } from '@/lib/types';

const HISTORY_PAGE_SIZE = 10;
const SERIES_PAGE_SIZE = 100;

export default function WeightPage() {
  const today = todayKey();
  const dataRevision = useDataRevision();

  const [historyPage, setHistoryPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WeightLog | null>(null);

  const current = useAsync(() => api.weights.current(), [revision, dataRevision]);
  const goal = useAsync(() => api.goals.current(today), [today, revision, dataRevision]);
  const series = useAsync(
    () => api.weights.list({ page: 1, pageSize: SERIES_PAGE_SIZE }),
    [revision, dataRevision],
  );
  const history = useAsync(
    () => api.weights.list({ page: historyPage, pageSize: HISTORY_PAGE_SIZE }),
    [historyPage, revision, dataRevision],
  );

  const latest = current.data?.weight ?? null;
  const readings = series.data?.data ?? [];
  const previous = readings[1] ?? null;
  const starting =
    series.data && series.data.meta.totalItems <= readings.length
      ? readings[readings.length - 1] ?? null
      : readings[readings.length - 1] ?? null;
  const targetKg = goal.data?.goal?.targetWeightKg ?? null;
  const sinceLast = latest && previous ? latest.kg - previous.kg : null;
  const totalChange = latest && starting ? latest.kg - starting.kg : null;
  const daysSpan =
    latest && starting
      ? Math.max(0, differenceInCalendarDays(parseISO(`${latest.loggedOn}T00:00:00`), parseISO(`${starting.loggedOn}T00:00:00`)))
      : null;
  const toGo = latest && targetKg != null ? latest.kg - targetKg : null;

  function refreshAll() {
    setHistoryPage(1);
    setRevision((value) => value + 1);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);

    try {
      await api.weights.remove(id);
      if (editing?.id === id) {
        setEditing(null);
      }
      setNotice('That weigh-in was deleted.');
      refreshAll();
    } catch (caught) {
      setDeleteError(errorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="page-masthead flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Weigh-in</p>
          <h1 className="mt-1 text-[1.75rem] font-medium tracking-tight sm:text-3xl">Weigh-in</h1>
          <p className="mt-1 max-w-md text-sm text-muted">
            One reading per calendar day. Saving again on the same date replaces the previous mark.
          </p>
        </div>
      </header>

      {notice && !deleteError && <Alert tone="info">{notice}</Alert>}
      {current.error && <Alert>{current.error}</Alert>}

      <section className="grid gap-px overflow-hidden rounded-md bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {current.isLoading && !current.data ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              icon={<ScaleIcon />}
              label="Current weight"
              value={latest ? `${formatKg(latest.kg)} kg` : '—'}
              hint={
                sinceLast == null
                  ? latest
                    ? 'First entry'
                    : 'Log your first weigh-in'
                  : `${formatDeltaKg(sinceLast)} kg since last entry`
              }
              hintTone={sinceLast != null && sinceLast !== 0 ? 'accent' : 'muted'}
            />
            <StatCard
              icon={<StartIcon />}
              label="Starting weight"
              value={starting ? `${formatKg(starting.kg)} kg` : '—'}
              hint={starting ? formatDateKey(starting.loggedOn, 'd MMM yyyy') : 'Waiting on a first mark'}
            />
            <StatCard
              icon={<FlagIcon />}
              label="Goal weight"
              value={targetKg != null ? `${formatKg(targetKg)} kg` : '—'}
              hint={
                targetKg == null
                  ? 'Open Target to set one'
                  : toGo == null
                    ? 'Log a weigh-in to compare'
                    : Math.abs(toGo) < 0.05
                      ? 'On the mark'
                      : `${formatKg(Math.abs(toGo))} kg to go`
              }
            />
            <StatCard
              icon={<ChangeIcon />}
              label="Total change"
              value={
                totalChange == null
                  ? '—'
                  : `${totalChange > 0 ? '+' : ''}${formatKg(totalChange)} kg`
              }
              hint={
                daysSpan == null
                  ? 'Needs two weigh-ins'
                  : daysSpan === 0
                    ? 'Same day'
                    : `in ${daysSpan} ${daysSpan === 1 ? 'day' : 'days'}`
              }
              valueTone={totalChange != null && totalChange !== 0 ? 'accent' : 'default'}
            />
          </>
        )}
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
          {current.isLoading && !current.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <WeightComposer
              key={`${editing?.id ?? 'new'}-${latest?.id ?? 'none'}`}
              latest={latest}
              editing={editing}
              onSaved={(saved) => {
                setEditing(null);
                setNotice(`Saved ${formatKg(saved.kg)} kg for ${formatDateKey(saved.loggedOn, 'd MMM yyyy')}.`);
                refreshAll();
              }}
            />
          )}
        </div>
        <div className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
          {series.error && (
            <div className="mb-3">
              <Alert>{series.error}</Alert>
            </div>
          )}
          {series.isLoading && !series.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <WeightChart readings={readings} />
          )}
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">History</h2>
            <p className="mt-0.5 text-sm text-muted">Your previous weight entries.</p>
          </div>
          {history.data && history.data.meta.totalItems > 0 && (
            <span className="text-xs text-subtle">
              {history.data.meta.totalItems}{' '}
              {history.data.meta.totalItems === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {deleteError && <Alert>{deleteError}</Alert>}
        {history.error && <Alert>{history.error}</Alert>}

        {history.isLoading && !history.data ? (
          <Skeleton className="h-28 w-full" />
        ) : !history.data || history.data.data.length === 0 ? (
          <EmptyState
            title="No weigh-ins yet"
            description="Log a weight above. One reading per calendar day — saving again on the same day replaces it."
          />
        ) : (
          <>
            <WeightHistory
              readings={history.data.data}
              timeline={readings}
              deletingId={deletingId}
              onEdit={(row) => {
                setEditing(row);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={handleDelete}
            />
            <Pagination {...history.data.meta} onPageChange={setHistoryPage} />
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  hintTone = 'muted',
  valueTone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  hintTone?: 'muted' | 'accent';
  valueTone?: 'default' | 'accent';
}) {
  return (
    <article className="bg-[#1a1614] px-5 py-4 text-[#f4efe6]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#ebe4d8]/55">{label}</p>
          <p
            className={
              valueTone === 'accent'
                ? 'mt-1 text-2xl font-medium tracking-tight tabular-nums text-[#e8b86d]'
                : 'mt-1 text-2xl font-medium tracking-tight tabular-nums'
            }
          >
            {value}
          </p>
          <p className={hintTone === 'accent' ? 'mt-1 text-xs text-[#e8b86d]' : 'mt-1 text-xs text-[#ebe4d8]/55'}>
            {hint}
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-white/8 text-[#ebe4d8]/70">
          {icon}
        </span>
      </div>
    </article>
  );
}

function ScaleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <rect x="4" y="5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StartIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path
        d="M4 13.5 8 9.5l3 3 5.5-6M12.5 6.5h4v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path
        d="M5.5 16V4.5h9l-2 3 2 3H5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChangeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path
        d="M12.5 5.5 16 9l-3.5 3.5M16 9H8.5a4 4 0 0 0 0 8H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
