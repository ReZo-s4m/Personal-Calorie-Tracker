'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api, ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { formatCalories, formatDateKey, todayKey } from '@/lib/format';
import { Alert, Button, DateField, cx } from '@/components/ui';
import type { Goal } from '@/lib/types';

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };
const ACTIVITY_KEY = 'nutriai.activityLevel';

type Intent = 'lose_fat' | 'build_muscle' | 'maintain';
type ActivityId = 'sedentary' | 'light' | 'moderate' | 'very';

const INTENTS: {
  id: Intent;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}[] = [
  { id: 'lose_fat', label: 'Lose fat', calories: 2200, protein: 150, carbs: 250, fat: 73 },
  { id: 'build_muscle', label: 'Build muscle', calories: 2600, protein: 180, carbs: 260, fat: 72 },
  { id: 'maintain', label: 'Maintain', calories: 2400, protein: 165, carbs: 240, fat: 73 },
];

const ACTIVITIES: {
  id: ActivityId;
  label: string;
  detail: string;
  factor: number;
}[] = [
  { id: 'sedentary', label: 'Low', detail: 'Little or no exercise', factor: 0.87 },
  { id: 'light', label: 'Light', detail: '1–3 days a week', factor: 1 },
  { id: 'moderate', label: 'Medium', detail: '3–5 days a week', factor: 1.13 },
  { id: 'very', label: 'High', detail: '6+ days a week', factor: 1.25 },
];

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function macroShare(grams: number, kcalPerGram: number, calories: number) {
  if (!(calories > 0) || !(grams > 0)) {
    return 0;
  }
  return Math.round(((grams * kcalPerGram) / calories) * 100);
}

function guessIntent(goal: Goal | null): Intent | null {
  if (!goal) {
    return null;
  }

  const match = INTENTS.find(
    (intent) =>
      intent.calories === Math.round(goal.dailyCalories) &&
      intent.protein === Math.round(goal.proteinGrams) &&
      intent.carbs === Math.round(goal.carbGrams) &&
      intent.fat === Math.round(goal.fatGrams),
  );

  return match?.id ?? null;
}

function scalePreset(intent: Intent, factor: number) {
  const preset = INTENTS.find((item) => item.id === intent)!;
  return {
    calories: roundTo(preset.calories * factor, 10),
    protein: roundTo(preset.protein * factor, 1),
    carbs: roundTo(preset.carbs * factor, 1),
    fat: roundTo(preset.fat * factor, 1),
  };
}

export function GoalComposer({
  currentGoal,
  todayCalories,
  onSaved,
}: {
  currentGoal: Goal | null;
  todayCalories: number | null;
  onSaved: (goal: Goal) => void;
}) {
  const [intent, setIntent] = useState<Intent | null>(
    () => guessIntent(currentGoal) ?? (currentGoal ? null : 'build_muscle'),
  );
  const [activity, setActivity] = useState<ActivityId>('light');
  const [calories, setCalories] = useState(currentGoal?.dailyCalories ?? 2600);
  const [protein, setProtein] = useState(currentGoal?.proteinGrams ?? 180);
  const [carbs, setCarbs] = useState(currentGoal?.carbGrams ?? 260);
  const [fat, setFat] = useState(currentGoal?.fatGrams ?? 72);
  const [targetWeightKg, setTargetWeightKg] = useState(
    currentGoal?.targetWeightKg == null ? '' : String(currentGoal.targetWeightKg),
  );
  const [effectiveFrom, setEffectiveFrom] = useState(currentGoal?.effectiveFrom ?? todayKey());
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVITY_KEY);
    if (ACTIVITIES.some((item) => item.id === stored)) {
      setActivity(stored as ActivityId);
    }
  }, []);

  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  const proteinPct = macroShare(protein, KCAL_PER_GRAM.protein, calories);
  const carbPct = macroShare(carbs, KCAL_PER_GRAM.carbs, calories);
  const fatPct = macroShare(fat, KCAL_PER_GRAM.fat, calories);
  const factor = ACTIVITIES.find((item) => item.id === activity)?.factor ?? 1;
  const used =
    todayCalories != null && calories > 0 ? Math.min(1, todayCalories / calories) : null;
  const remaining = todayCalories != null ? Math.max(0, calories - todayCalories) : null;
  const goalLabel = INTENTS.find((item) => item.id === intent)?.label ?? 'Custom';
  const since = currentGoal?.effectiveFrom ?? effectiveFrom;

  function applyIntent(next: Intent) {
    const scaled = scalePreset(next, factor);
    setIntent(next);
    setCalories(scaled.calories);
    setProtein(scaled.protein);
    setCarbs(scaled.carbs);
    setFat(scaled.fat);
  }

  function applyActivity(next: ActivityId) {
    const previous = ACTIVITIES.find((item) => item.id === activity)?.factor ?? 1;
    const upcoming = ACTIVITIES.find((item) => item.id === next)?.factor ?? 1;
    const scale = upcoming / previous;
    setActivity(next);
    window.localStorage.setItem(ACTIVITY_KEY, next);

    if (intent) {
      const scaled = scalePreset(intent, upcoming);
      setCalories(scaled.calories);
      setProtein(scaled.protein);
      setCarbs(scaled.carbs);
      setFat(scaled.fat);
      return;
    }

    setCalories(roundTo(calories * scale, 10));
    setProtein(roundTo(protein * scale, 1));
    setCarbs(roundTo(carbs * scale, 1));
    setFat(roundTo(fat * scale, 1));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const goal = await api.goals.save({
        dailyCalories: calories,
        proteinGrams: protein,
        carbGrams: carbs,
        fatGrams: fat,
        ...(targetWeightKg ? { targetWeightKg: Number(targetWeightKg) } : {}),
        ...(effectiveFrom ? { effectiveFrom } : {}),
      });

      onSaved(goal);
    } catch (caught) {
      setError(caught);
    } finally {
      setIsSubmitting(false);
    }
  }

  const bannerError =
    error && !(error instanceof ApiError && error.fieldErrors.length > 0)
      ? errorMessage(error)
      : null;

  const reduce = Boolean(useReducedMotion());

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {bannerError && <Alert>{bannerError}</Alert>}

      <div className="page-masthead flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Health</p>
          <h1 aria-label="Target" className="mt-1 text-[1.75rem] font-medium tracking-tight sm:text-3xl">
            Target
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted">
            Set your daily calories and macros. They start from the date you choose below.
          </p>
        </div>
        <Button type="submit" isLoading={isSubmitting} className="shrink-0">
          Save goals
        </Button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <motion.aside
          initial={reduce ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-3"
        >
          {INTENTS.map((item) => {
            const selected = intent === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={reduce ? undefined : { scale: 0.98 }}
                onClick={() => applyIntent(item.id)}
                className={cx(
                  'relative overflow-hidden rounded-md border px-4 py-4 text-left transition-colors',
                  selected
                    ? 'border-foreground bg-foreground text-on-accent'
                    : 'border-border bg-surface text-foreground hover:border-foreground',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="intent-mark"
                    className="absolute inset-y-0 left-0 w-1 bg-accent"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={cx('mt-1 block text-xs', selected ? 'text-on-accent/70' : 'text-muted')}>
                  {formatCalories(scalePreset(item.id, factor).calories)} kcal starting point
                </span>
              </motion.button>
            );
          })}

          <div className="mt-2 rounded-md border border-border bg-surface p-4">
            <p className="text-sm font-medium">Activity</p>
            <p className="mt-0.5 text-xs text-muted">Taller bar means more activity.</p>
            <div className="mt-4 flex h-28 items-end gap-2">
              {ACTIVITIES.map((item, index) => {
                const selected = activity === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyActivity(item.id)}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <motion.span
                      animate={{ height: selected ? 96 : 28 + index * 18 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      className={cx(
                        'block w-full rounded-sm',
                        selected ? 'bg-accent' : 'bg-surface-raised',
                      )}
                    />
                    <span className={cx('text-[10px] leading-tight', selected ? 'font-semibold text-foreground' : 'text-muted')}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-border bg-surface p-5 sm:p-6"
        >
          <p className="font-display text-base italic text-accent">{goalLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {currentGoal
              ? `In force since ${formatDateKey(since, 'd MMM yyyy')}`
              : 'Save to put this target in force.'}
          </p>

          <ValueField
            id="dailyCalories"
            label="Daily energy"
            unit="kcal"
            value={calories}
            min={500}
            max={20_000}
            sliderMax={4000}
            step={50}
            jump={100}
            size="hero"
            error={fieldError('dailyCalories')}
            onChange={(value) => {
              setCalories(value);
              setIntent(null);
            }}
          />

          {used != null && remaining != null && (
            <p className="mt-4 text-sm text-muted">
              Today {Math.round(used * 100)}% of this goal — {formatCalories(remaining)} kcal left
            </p>
          )}

          <div className="mt-6 h-3 overflow-hidden rounded-sm bg-surface-raised">
            <div className="flex h-full">
              <motion.div
                className="h-full bg-protein"
                animate={{ width: `${proteinPct}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              />
              <motion.div
                className="h-full bg-carbs"
                animate={{ width: `${carbPct}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              />
              <motion.div
                className="h-full bg-fat"
                animate={{ width: `${fatPct}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
            <span>Protein {proteinPct}%</span>
            <span>Carbs {carbPct}%</span>
            <span>Fat {fatPct}%</span>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <ValueField
              id="proteinGrams"
              label="Protein"
              unit="g"
              value={protein}
              min={0}
              max={2_000}
              sliderMax={500}
              step={5}
              jump={10}
              error={fieldError('proteinGrams')}
              onChange={(value) => {
                setProtein(value);
                setIntent(null);
              }}
            />
            <ValueField
              id="carbGrams"
              label="Carbs"
              unit="g"
              value={carbs}
              min={0}
              max={2_000}
              sliderMax={500}
              step={5}
              jump={10}
              error={fieldError('carbGrams')}
              onChange={(value) => {
                setCarbs(value);
                setIntent(null);
              }}
            />
            <ValueField
              id="fatGrams"
              label="Fat"
              unit="g"
              value={fat}
              min={0}
              max={2_000}
              sliderMax={250}
              step={5}
              jump={10}
              error={fieldError('fatGrams')}
              onChange={(value) => {
                setFat(value);
                setIntent(null);
              }}
            />
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted">Target weight (kg), optional</span>
              <input
                id="targetWeightKg"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="Leave empty if you are not tracking weight"
                value={targetWeightKg}
                aria-invalid={Boolean(fieldError('targetWeightKg')) || undefined}
                onChange={(event) => setTargetWeightKg(event.target.value)}
                className="mt-1.5 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {fieldError('targetWeightKg') && (
                <span className="text-xs text-danger">{fieldError('targetWeightKg')}</span>
              )}
            </label>
            <div>
              <span className="text-xs text-muted">Effective from</span>
              <div className="mt-1.5">
                <DateField
                  id="effectiveFrom"
                  value={effectiveFrom}
                  hasError={Boolean(fieldError('effectiveFrom'))}
                  onChange={setEffectiveFrom}
                />
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </form>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ValueField({
  id,
  label,
  unit,
  value,
  min,
  max,
  sliderMax,
  step,
  jump,
  size = 'row',
  error,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  sliderMax?: number;
  step: number;
  jump: number;
  size?: 'hero' | 'row';
  error?: string;
  onChange: (value: number) => void;
}) {
  const hero = size === 'hero';
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const valueRef = useRef(value);
  const holdRef = useRef<number | null>(null);
  valueRef.current = value;

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  useEffect(() => {
    return () => stopHold();
  }, []);

  function apply(next: number) {
    const clamped = clamp(next, min, max);
    valueRef.current = clamped;
    onChange(clamped);
  }

  function nudge(delta: number) {
    apply(valueRef.current + delta);
  }

  function stopHold() {
    if (holdRef.current != null) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }

  function startHold(event: PointerEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    nudge(delta);
    const started = Date.now();
    holdRef.current = window.setInterval(() => {
      const amount = Date.now() - started > 550 ? delta * 2 : delta;
      nudge(amount);
    }, 85);
  }

  function commitDraft() {
    const parsed = Number(draft.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) {
      setDraft(String(valueRef.current));
      return;
    }
    apply(parsed);
    setDraft(String(clamp(parsed, min, max)));
  }

  const railMax = Math.max(sliderMax ?? max, value);
  const display = focused ? draft : String(Math.round(value));

  return (
    <div className={hero ? 'mt-6 border-b border-border pb-5' : 'border-b border-border py-3'}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor={id} className="min-w-0 flex-1">
          <span className="text-xs text-muted">{label}</span>
          <span className="mt-1 flex items-baseline gap-2">
            <input
              id={id}
              inputMode="numeric"
              aria-label={label}
              value={display}
              aria-invalid={Boolean(error) || undefined}
              onFocus={(event) => {
                setFocused(true);
                setDraft(String(value));
                event.currentTarget.select();
              }}
              onBlur={() => {
                commitDraft();
                setFocused(false);
              }}
              onChange={(event) => {
                const next = event.target.value;
                setFocused(true);
                setDraft(next);
                const parsed = Number(next.replace(/,/g, ''));
                if (next !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
                  apply(parsed);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  nudge(event.shiftKey ? jump : step);
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  nudge(event.shiftKey ? -jump : -step);
                }
              }}
              className={cx(
                'w-full min-w-0 bg-transparent tabular-nums outline-none',
                hero
                  ? 'text-5xl font-medium tracking-tight sm:text-6xl'
                  : 'text-lg font-medium tracking-tight',
              )}
            />
            <span className={cx('shrink-0 text-muted', hero ? 'text-sm' : 'text-xs')}>{unit}</span>
          </span>
        </label>

        <div className="flex items-center gap-1.5">
          <NudgeButton
            label={`Decrease ${label} by ${jump}`}
            onHoldStart={(event) => startHold(event, -jump)}
            onHoldEnd={stopHold}
          >
            -{jump}
          </NudgeButton>
          <NudgeButton
            label={`Decrease ${label}`}
            onHoldStart={(event) => startHold(event, -step)}
            onHoldEnd={stopHold}
          >
            -
          </NudgeButton>
          <NudgeButton
            label={`Increase ${label}`}
            onHoldStart={(event) => startHold(event, step)}
            onHoldEnd={stopHold}
          >
            +
          </NudgeButton>
          <NudgeButton
            label={`Increase ${label} by ${jump}`}
            onHoldStart={(event) => startHold(event, jump)}
            onHoldEnd={stopHold}
          >
            +{jump}
          </NudgeButton>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={railMax}
        step={1}
        value={Math.min(value, railMax)}
        aria-label={`${label} slider`}
        onChange={(event) => apply(Number(event.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-raised accent-[var(--accent)]"
      />
      {hero && (
        <p className="mt-1.5 text-[11px] text-subtle">
          Type any number up to {max.toLocaleString()} {unit}. Drag or +/- for smaller steps. Shift +
          arrows jumps {jump} {unit}.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function NudgeButton({
  label,
  children,
  onHoldStart,
  onHoldEnd,
}: {
  label: string;
  children: ReactNode;
  onHoldStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onHoldEnd: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="min-w-10 rounded-sm border border-border bg-surface-raised px-2.5 py-2 text-xs font-semibold tabular-nums hover:border-foreground"
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}
