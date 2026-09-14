'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { todayKey } from '@/lib/format';
import { Alert, Button, DateField } from '@/components/ui';
import type { WeightLog } from '@/lib/types';

export function WeightComposer({
  latest,
  editing,
  onSaved,
}: {
  latest: WeightLog | null;
  editing: WeightLog | null;
  onSaved: (weight: WeightLog) => void;
}) {
  const [kg, setKg] = useState(editing ? String(editing.kg) : latest ? String(latest.kg) : '');
  const [loggedOn, setLoggedOn] = useState(editing?.loggedOn ?? todayKey());
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  function nudge(delta: number) {
    const current = Number(kg);
    const next = (Number.isFinite(current) ? current : 0) + delta;
    const clamped = Math.min(500, Math.max(0.1, Math.round(next * 10) / 10));
    setKg(String(clamped));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const weight = await api.weights.save({
        kg: Number(kg),
        loggedOn,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onSaved(weight);
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
      {bannerError && (
        <div className="mb-4">
          <Alert>{bannerError}</Alert>
        </div>
      )}

      <h2 className="text-base font-semibold">Log your weight</h2>
      <p className="mt-0.5 text-sm text-muted">Add a new weight entry to track your progress.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium">Date</p>
          <DateField
            id="weightLoggedOn"
            value={loggedOn}
            hasError={Boolean(fieldError('loggedOn'))}
            onChange={setLoggedOn}
          />
          {fieldError('loggedOn') && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {fieldError('loggedOn')}
            </p>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Weight (kg)</span>
          <span className="flex items-center rounded-sm border border-border-strong bg-surface focus-within:border-accent">
            <input
              id="weightKg"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={500}
              step={0.1}
              required
              placeholder="0.0"
              value={kg}
              aria-invalid={Boolean(fieldError('kg')) || undefined}
              onChange={(event) => setKg(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="mr-1 flex flex-col">
              <StepButton label="Increase by 0.1 kg" onClick={() => nudge(0.1)}>
                <StepChevron />
              </StepButton>
              <StepButton label="Decrease by 0.1 kg" onClick={() => nudge(-0.1)}>
                <StepChevron down />
              </StepButton>
            </span>
          </span>
          {fieldError('kg') && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {fieldError('kg')}
            </p>
          )}
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">Note (optional)</span>
        <input
          id="weightNote"
          type="text"
          maxLength={200}
          placeholder="e.g. Morning, after coffee..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle outline-none focus:border-accent"
        />
      </label>

      <div className="mt-6 w-full">
        <Button type="submit" isLoading={isSubmitting} className="flex w-full py-2.5">
          Save weight
        </Button>
      </div>
    </form>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-4 w-7 place-items-center text-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function StepChevron({ down }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 8"
      className="size-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      {down ? <path d="M1.5 1.5 6 6 10.5 1.5" /> : <path d="M1.5 6.5 6 2 10.5 6.5" />}
    </svg>
  );
}
