'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { NutritionMacroCard } from '@/components/ui/animated-dashboard-card';
import { useTodayMotion } from '@/components/dashboard/useTodayMotion';
import { EntryFormModal } from '@/components/entries/EntryFormModal';
import { WeeklyIntakeChart } from '@/components/dashboard/WeeklyIntakeChart';
import { SourceBadge } from '@/components/entries/SourceBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Button, Skeleton, cx } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api, isAiOnline } from '@/lib/api-client';
import { useDataRevision } from '@/lib/data-sync';
import { daysAgoKey, formatCalories, todayKey } from '@/lib/format';
import { MEAL_LABELS, MEAL_TYPES, type FoodEntry, type MealType } from '@/lib/types';

export default function DashboardPage() {
  const today = todayKey();
  const dataRevision = useDataRevision();
  const rootRef = useRef<HTMLDivElement>(null);
  useTodayMotion(rootRef);

  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [composingMeal, setComposingMeal] = useState<MealType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FoodEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const aiStatus = useAsync(() => api.ai.status(), []);
  const goal = useAsync(() => api.goals.current(today), [today, reloadToken, dataRevision]);

  const entries = useAsync(
    () => api.entries.list({ from: today, to: today, pageSize: 100, order: 'asc' }),
    [today, reloadToken, dataRevision],
  );

  const trend = useAsync(
    () => api.reports.daily({ from: daysAgoKey(6), to: today, pageSize: 7 }),
    [today, reloadToken, dataRevision],
  );

  const isAiAvailable = isAiOnline(aiStatus.data);
  const totals = entries.data?.totals;
  const target = goal.data?.goal;
  const remaining =
    target && totals ? Math.max(0, target.dailyCalories - totals.calories) : null;
  const used =
    target && totals ? Math.min(1, totals.calories / Math.max(target.dailyCalories, 1)) : null;
  const protein = totals ? Math.round(totals.proteinGrams) : 0;
  const carbs = totals ? Math.round(totals.carbGrams) : 0;
  const fat = totals ? Math.round(totals.fatGrams) : 0;
  const macroScale = Math.max(protein, carbs, fat, totals?.calories ?? 0, 1);
  const loggedCount = entries.data?.meta.totalItems ?? 0;

  const closeForm = () => {
    setEditingEntry(null);
    setComposingMeal(null);
  };

  const handleSaved = () => {
    closeForm();
    refresh();
  };

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.entries.remove(pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const weekday = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      <header data-today="head" className="page-masthead">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="kicker">Today</p>
            <h1 className="mt-2 text-3xl sm:text-5xl">{weekday}</h1>
            {totals !== undefined && (
              <p className="mt-3 max-w-xl text-sm text-muted">
                {loggedCount === 0
                  ? 'No food logged yet. Open Add Meal to add your first meal.'
                  : `${loggedCount} ${loggedCount === 1 ? 'meal' : 'meals'} logged · ${formatCalories(totals.calories)} kcal.`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx(
              'inline-flex items-center rounded-md border px-3 py-2 text-xs font-bold',
              isAiAvailable
                ? 'border-accent/25 bg-accent-soft text-accent'
                : 'border-border bg-surface text-muted',
            )}>
              AI {isAiAvailable ? 'online' : 'offline'}
            </span>
            <Button className="shrink-0" onClick={() => setComposingMeal('breakfast')}>Add Meal</Button>
          </div>
        </div>
      </header>

      {entries.error && <Alert>{entries.error}</Alert>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-md border border-border bg-surface shadow-[0_18px_42px_rgb(15_23_42/0.07)]">
          <div className="grid lg:grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)]">
            <div data-today="stat" className="ink-panel flex min-h-80 flex-col justify-between gap-6 p-6 sm:p-7">
              {totals === undefined ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <>
                  <EnergyLedger
                    calories={totals.calories}
                    remaining={remaining}
                    used={used}
                    protein={protein}
                    carbs={carbs}
                    fat={fat}
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-white/10 bg-white/[0.06] p-3">
                      <p className="text-white/50">Logged</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">{loggedCount}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.06] p-3">
                      <p className="text-white/50">Target</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {target ? formatCalories(target.dailyCalories) : 'Unset'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              data-today="macros"
              className="grid border-t border-border bg-surface sm:grid-cols-2 lg:grid-cols-4 lg:border-l lg:border-t-0"
            >
              <NutritionMacroCard
                label="Calories"
                consumed={totals?.calories ?? null}
                target={target?.dailyCalories ?? null}
                unit="kcal"
                color="#9a3412"
                isLoading={entries.isLoading && !totals}
                delay={0.08}
                scaleMax={macroScale}
                className="border-b border-border sm:border-r lg:border-b-0"
              />
              <NutritionMacroCard
                label="Protein"
                consumed={totals ? protein : null}
                target={target ? Math.round(target.proteinGrams) : null}
                unit="g"
                color="#2563eb"
                isLoading={entries.isLoading && !totals}
                delay={0.12}
                scaleMax={macroScale}
                className="border-b border-border lg:border-b-0 lg:border-r"
              />
              <NutritionMacroCard
                label="Carbs"
                consumed={totals ? carbs : null}
                target={target ? Math.round(target.carbGrams) : null}
                unit="g"
                color="#f97316"
                isLoading={entries.isLoading && !totals}
                delay={0.16}
                scaleMax={macroScale}
                className="border-b border-border sm:border-b-0 sm:border-r"
              />
              <NutritionMacroCard
                label="Fat"
                consumed={totals ? fat : null}
                target={target ? Math.round(target.fatGrams) : null}
                unit="g"
                color="#d946ef"
                isLoading={entries.isLoading && !totals}
                delay={0.2}
                scaleMax={macroScale}
              />
            </div>
          </div>
        </div>

        <aside className="app-panel flex flex-col justify-between gap-5 p-5">
          <div>
            <p className="kicker">Next</p>
            <h2 className="mt-2 text-xl">Add a meal</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Log each meal as you eat, then check reports at the end of the day.
            </p>
          </div>
          <div className="grid gap-2">
            <Button onClick={() => setComposingMeal('lunch')} className="w-full">Add Meal</Button>
            <Link href="/reports">
              <Button variant="secondary" className="w-full">Open reports</Button>
            </Link>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="kicker">Meals</p>
              <h2 className="mt-1 text-2xl">Today’s meals</h2>
            </div>
          </div>
          <div className="app-panel overflow-hidden">
            {totals === undefined ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                {MEAL_TYPES.map((meal) => {
                  const mealEntries = (entries.data?.data ?? []).filter((item) => item.mealType === meal);
                  const mealCalories = mealEntries.reduce((sum, item) => sum + item.calories, 0);
                  const percent = totals.calories > 0 ? Math.min(100, (mealCalories / totals.calories) * 100) : 0;

                  return (
                    <article key={meal} data-today="meal" className="min-h-56 p-5">
                      <header className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{MEAL_LABELS[meal]}</p>
                          <p className="mt-1 text-xs text-subtle">
                            {mealEntries.length === 0
                              ? 'No entries yet'
                              : `${mealEntries.length} ${mealEntries.length === 1 ? 'item' : 'items'}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setComposingMeal(meal)}
                          className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          Add
                        </button>
                      </header>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <p className="text-3xl font-black tabular-nums">{formatCalories(mealCalories)}</p>
                        <p className="pb-1 text-xs font-bold uppercase tracking-[0.12em] text-subtle">kcal</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                      </div>

                      <div className="mt-4">
                        {mealEntries.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setComposingMeal(meal)}
                            className="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-border text-xs font-semibold text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
                          >
                            Add Meal
                          </button>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {mealEntries.slice(0, 3).map((entry) => (
                              <li key={entry.id} className="rounded-md bg-surface-raised px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="min-w-0 truncate text-sm font-semibold">{entry.foodName}</p>
                                  <p className="shrink-0 text-sm font-bold tabular-nums">{formatCalories(entry.calories)}</p>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <SourceBadge source={entry.source} />
                                  <span className="text-xs text-subtle">
                                    {entry.quantity} {entry.unit}
                                  </span>
                                  <span className="ml-auto flex gap-1">
                                    <button
                                      type="button"
                                      className="text-xs font-bold text-muted hover:text-accent"
                                      onClick={() => setEditingEntry(entry)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="text-xs font-bold text-muted hover:text-danger"
                                      onClick={() => setPendingDelete(entry)}
                                    >
                                      Delete
                                    </button>
                                  </span>
                                </div>
                              </li>
                            ))}
                            {mealEntries.length > 3 && (
                              <li className="text-xs font-semibold text-subtle">
                                +{mealEntries.length - 3} more in this lane
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section data-today="week">
          {trend.isLoading ? (
            <div className="app-panel p-5 sm:p-6">
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <WeeklyIntakeChart rows={trend.data?.data ?? []} />
          )}
        </section>
      </section>

      {(composingMeal || editingEntry) && (
        <EntryFormModal
          entry={editingEntry}
          defaultMealType={composingMeal ?? 'breakfast'}
          isAiAvailable={isAiAvailable}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this meal?"
          description={`“${pendingDelete.foodName}” will be removed from today’s log. This cannot be undone.`}
          confirmLabel="Delete meal"
          isBusy={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setPendingDelete(null);
            }
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}


function EnergyLedger({
  calories,
  remaining,
  used,
  protein,
  carbs,
  fat,
}: {
  calories: number;
  remaining: number | null;
  used: number | null;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const hero = remaining != null ? remaining : calories;
  const heroLabel = remaining != null ? 'kcal left' : 'kcal so far';
  const percent = used != null ? Math.round(used * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-1">
        <div className="relative grid size-36 place-items-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(var(--accent) ${percent ?? 0}%, rgba(255,255,255,0.12) 0)`,
            }}
          />
          <div className="absolute inset-2 rounded-full bg-[var(--rail)]" />
          <div className="relative text-center">
            <p className="text-3xl font-black leading-none tabular-nums">{percent ?? 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">used</p>
          </div>
        </div>
        <div className="self-center">
          <p className="kicker">Energy</p>
          <p className="mt-2 text-5xl font-black leading-none tabular-nums">
            {formatCalories(hero)}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">{heroLabel}</p>
        </div>
      </div>
      <div>
        <p className="text-sm text-white/70">
          {remaining != null
            ? `${formatCalories(calories)} kcal consumed against today’s plan.`
            : 'Set a goal to compare the day against a calorie plan.'}
        </p>
        {used != null && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-accent" style={{ width: `${used * 100}%` }} />
          </div>
        )}
      </div>
      <MacroMixBar protein={protein} carbs={carbs} fat={fat} onInk />
    </div>
  );
}

function MacroMixBar({
  protein,
  carbs,
  fat,
  onInk = false,
}: {
  protein: number;
  carbs: number;
  fat: number;
  onInk?: boolean;
}) {
  const total = protein + carbs + fat;
  const parts = [
    { label: 'Protein', value: protein, color: 'var(--protein)' },
    { label: 'Carbs', value: carbs, color: 'var(--carbs)' },
    { label: 'Fat', value: fat, color: 'var(--fat)' },
  ];

  if (total <= 0) {
    return (
      <p className={onInk ? 'text-xs text-[#ebe4d8]/50' : 'text-xs text-subtle'}>
        Macros appear here once a meal is logged.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className={cx('flex h-1.5 overflow-hidden', onInk ? 'bg-white/15' : 'bg-surface-raised')}>
        {parts.map((part) => (
          <motion.div
            key={part.label}
            className="h-full"
            style={{ backgroundColor: part.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(part.value / total) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((part) => (
          <li
            key={part.label}
            className={onInk ? 'flex items-center gap-1.5 text-xs text-[#ebe4d8]/70' : 'flex items-center gap-1.5 text-xs text-muted'}
          >
            <span className="size-1.5" style={{ backgroundColor: part.color }} />
            {part.label} {part.value}g
          </li>
        ))}
      </ul>
    </div>
  );
}
