'use client';

import { useId, useState, type DragEvent, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { useAsync } from '@/hooks/useAsync';
import { Alert, Button, DateTimeField, Field, Input, Textarea, cx } from '@/components/ui';
import { LogMealSidebar } from './LogMealSidebar';
import { MicronutrientFields } from './MicronutrientFields';
import { ScanBreakdown } from './ScanBreakdown';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  type ExtractionResult,
  type FoodEntry,
  type MealType,
  type Micronutrient,
} from '@/lib/types';

interface MealValues {
  foodName: string;
  quantity: string;
  unit: string;
  calories: string;
  proteinGrams: string;
  carbGrams: string;
  fatGrams: string;
}

const emptyMeal = (): MealValues => ({
  foodName: '',
  quantity: '',
  unit: 'g',
  calories: '',
  proteinGrams: '',
  carbGrams: '',
  fatGrams: '',
});

interface LogMealComposerProps {
  isAiAvailable: boolean;
  onSaved: (entries: FoodEntry[]) => void;
  recentRevision?: number;
}

function toLocalInputValue(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoTimestamp(localValue: string): string | null {
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function LogMealComposer({ isAiAvailable, onSaved, recentRevision = 0 }: LogMealComposerProps) {
  const fileInputId = useId();
  const recentEntries = useAsync(
    () => api.entries.list({ pageSize: 5, sort: 'consumedAt', order: 'desc' }),
    [recentRevision],
  );

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [values, setValues] = useState<MealValues>(emptyMeal);
  const [micronutrients, setMicronutrients] = useState<Micronutrient[]>([]);
  const [consumedAt, setConsumedAt] = useState(toLocalInputValue);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [mode, setMode] = useState<'type' | 'photo'>('type');

  const usedPhoto = Boolean(extraction);
  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  const setValue = (key: keyof MealValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  function resetComposer() {
    setMealType('breakfast');
    setValues(emptyMeal());
    setMicronutrients([]);
    setConsumedAt(toLocalInputValue());
    setNotes('');
    setExtraction(null);
    setExtractError(null);
    setError(null);
    setMode('type');
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function chooseMode(next: 'type' | 'photo') {
    setMode(next);
    if (next === 'type') {
      setExtraction(null);
      setExtractError(null);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    }
  }

  function applyRecent(entry: FoodEntry) {
    setMealType(entry.mealType);
    setValues({
      foodName: entry.foodName,
      quantity: String(entry.quantity),
      unit: entry.unit,
      calories: String(entry.calories),
      proteinGrams: String(entry.macros.proteinGrams),
      carbGrams: String(entry.macros.carbGrams),
      fatGrams: String(entry.macros.fatGrams),
    });
    setMicronutrients(entry.micronutrients);
    setNotes(entry.notes ?? '');
    setMode('type');
  }

  function applyExtraction(result: ExtractionResult) {
    const { entry } = result;
    setExtraction(result);
    setExtractError(null);

    if (result.suggestedMealType) {
      setMealType(result.suggestedMealType);
    }

    setValues({
      foodName: entry.foodName,
      quantity: String(entry.quantity),
      unit: entry.unit,
      calories: String(entry.calories),
      proteinGrams: String(entry.proteinGrams),
      carbGrams: String(entry.carbGrams),
      fatGrams: String(entry.fatGrams),
    });
    setMicronutrients(entry.micronutrients);
  }

  async function handleFile(file: File) {
    if (!isAiAvailable) {
      setExtractError('Photo reading is off on the server. Fill in the meal by hand.');
      return;
    }

    setExtractError(null);
    setIsExtracting(true);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });

    try {
      applyExtraction(await api.ai.extract(file));
    } catch (caught) {
      setExtractError(errorMessage(caught));
    } finally {
      setIsExtracting(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const consumedAtIso = toIsoTimestamp(consumedAt);
    if (!consumedAtIso) {
      setError(
        new ApiError(400, 'VALIDATION_ERROR', 'Check the highlighted field.', [
          { field: 'consumedAt', message: 'Enter a full date and time.' },
        ]),
      );
      return;
    }

    const details: { field: string; message: string }[] = [];
    if (!values.foodName.trim()) details.push({ field: 'foodName', message: 'Food name is required.' });
    if (!values.quantity.trim() || Number(values.quantity) <= 0) {
      details.push({ field: 'quantity', message: 'Quantity must be greater than zero.' });
    }
    if (!values.unit.trim()) details.push({ field: 'unit', message: 'Unit is required.' });
    if (values.calories.trim() === '' || Number(values.calories) < 0) {
      details.push({ field: 'calories', message: 'Calories are required.' });
    }

    if (details.length > 0) {
      setError(new ApiError(400, 'VALIDATION_ERROR', 'Fill in the required meal fields.', details));
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        foodName: values.foodName.trim(),
        mealType,
        quantity: Number(values.quantity),
        unit: values.unit.trim(),
        calories: Number(values.calories),
        proteinGrams: toNumber(values.proteinGrams),
        carbGrams: toNumber(values.carbGrams),
        fatGrams: toNumber(values.fatGrams),
        consumedAt: consumedAtIso,
        consumedOn: consumedAt.slice(0, 10),
        notes: notes.trim() || undefined,
        micronutrients: micronutrients.map((item) => ({
          nutrient: item.nutrient,
          amount: item.amount,
          unit: item.unit,
        })),
      };

      const saved = (
        await api.entries.batch({
          entries: [payload],
          source: usedPhoto ? 'image' : 'manual',
        })
      ).data;

      resetComposer();
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(errorMessage(caught)));
    } finally {
      setIsSaving(false);
    }
  }

  const bannerError =
    error && !(error instanceof ApiError && error.fieldErrors.length > 0) ? error.message : null;

  const plateItems = extraction?.components ?? [];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" data-log="composer">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={cx(
                'rounded-md border px-3 py-3 text-left transition-colors',
                mealType === type
                  ? 'border-foreground bg-foreground text-on-accent'
                  : 'border-border bg-surface text-muted hover:border-foreground hover:text-foreground',
              )}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                {type === 'breakfast' ? 'Morning' : type === 'lunch' ? 'Midday' : type === 'dinner' ? 'Evening' : 'Anytime'}
              </span>
              <span className="mt-1 block text-sm font-semibold">{MEAL_LABELS[type]}</span>
            </button>
          ))}
        </div>
        <div
          className="flex rounded-md border border-border bg-surface p-1"
          role="tablist"
          aria-label="How to add"
        >
          {(
            [
              ['type', 'Manual'],
              ['photo', 'Scan'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => chooseMode(value)}
              className={cx(
                'min-w-24 flex-1 rounded-sm px-4 py-2 text-sm font-semibold transition-colors',
                mode === value ? 'bg-accent text-on-accent' : 'text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start gap-5 sm:flex-row">
        <section data-log="form" className="flex min-w-0 w-full flex-1 flex-col gap-6 rounded-md border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
              {usedPhoto ? 'Scanned draft' : 'Manual entry'}
            </p>
            {usedPhoto && <p className="text-xs text-muted">Edit anything before saving.</p>}
          </div>

          {extractError && <Alert>{extractError}</Alert>}

          <div className="grid gap-4">
            <Field label="Food name" htmlFor="foodName" error={fieldError('foodName')} required>
              <Input
                id="foodName"
                value={values.foodName}
                required
                hasError={Boolean(fieldError('foodName'))}
                placeholder="Chicken burrito bowl"
                onChange={(event) => setValue('foodName', event.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount" htmlFor="quantity" error={fieldError('quantity')} required>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={values.quantity}
                  hasError={Boolean(fieldError('quantity'))}
                  placeholder="1"
                  onChange={(event) => setValue('quantity', event.target.value)}
                />
              </Field>
              <Field label="Unit" htmlFor="unit" error={fieldError('unit')} required>
                <Input
                  id="unit"
                  value={values.unit}
                  required
                  hasError={Boolean(fieldError('unit'))}
                  placeholder="bowl"
                  onChange={(event) => setValue('unit', event.target.value)}
                />
              </Field>
              <Field label="Calories" htmlFor="calories" error={fieldError('calories')} required>
                <Input
                  id="calories"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={values.calories}
                  hasError={Boolean(fieldError('calories'))}
                  placeholder="520"
                  onChange={(event) => setValue('calories', event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Protein (g)" htmlFor="proteinGrams" error={fieldError('proteinGrams')}>
                <Input
                  id="proteinGrams"
                  type="number"
                  step="any"
                  min="0"
                  value={values.proteinGrams}
                  placeholder="0"
                  onChange={(event) => setValue('proteinGrams', event.target.value)}
                />
              </Field>
              <Field label="Carbs (g)" htmlFor="carbGrams" error={fieldError('carbGrams')}>
                <Input
                  id="carbGrams"
                  type="number"
                  step="any"
                  min="0"
                  value={values.carbGrams}
                  placeholder="0"
                  onChange={(event) => setValue('carbGrams', event.target.value)}
                />
              </Field>
              <Field label="Fat (g)" htmlFor="fatGrams" error={fieldError('fatGrams')}>
                <Input
                  id="fatGrams"
                  type="number"
                  step="any"
                  min="0"
                  value={values.fatGrams}
                  placeholder="0"
                  onChange={(event) => setValue('fatGrams', event.target.value)}
                />
              </Field>
            </div>
          </div>

          <MicronutrientFields idPrefix="meal-micro" value={micronutrients} onChange={setMicronutrients} />

          <Field label="When" htmlFor="consumedAt" error={fieldError('consumedAt')} required>
            <DateTimeField
              id="consumedAt"
              value={consumedAt}
              hasError={Boolean(fieldError('consumedAt'))}
              onChange={setConsumedAt}
            />
          </Field>

          <Field label="Note" htmlFor="notes" error={fieldError('notes')} hint="Optional.">
            <Textarea
              id="notes"
              value={notes}
              placeholder="Sauce, cooking method, extras…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          {bannerError && <Alert>{bannerError}</Alert>}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit" isLoading={isSaving} className="min-w-36">
              Save meal
            </Button>
            <Button type="button" variant="secondary" onClick={resetComposer}>
              Reset
            </Button>
          </div>
        </section>

        <aside data-log="rail" className="flex w-full shrink-0 flex-col gap-4 sm:w-96">
          {mode === 'photo' && (
            <>
              <label
                htmlFor={fileInputId}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cx(
                  'relative flex cursor-pointer flex-col overflow-hidden rounded-md border transition-colors',
                  previewUrl ? 'min-h-48' : 'min-h-56 justify-center px-5 py-8',
                  isDragging ? 'border-accent bg-accent-soft' : 'border-border bg-[var(--rail)] text-[var(--rail-text)]',
                )}
              >
                {previewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Uploaded meal" className="h-48 w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm text-white">
                      {isExtracting ? 'Reading photo…' : extraction?.entry.foodName || 'Replace to scan again'}
                    </span>
                  </>
                ) : (
                  <div className="text-center">
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/10">
                      <CameraIcon />
                    </span>
                    <p className="mt-3 text-sm font-semibold">Drop a photo here</p>
                    <p className="mt-1 text-xs text-white/55">
                      {isAiAvailable
                        ? 'We’ll draft the meal. You confirm it.'
                        : 'Scan is off. Use Manual instead.'}
                    </p>
                  </div>
                )}
              </label>
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                  event.target.value = '';
                }}
              />

              <section className="rounded-md border border-border bg-surface p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  Scan result
                </p>
                {isExtracting && plateItems.length === 0 ? (
                  <p className="py-5 text-center text-xs text-muted">Reading the photo…</p>
                ) : extraction ? (
                  <div className="max-h-[28rem] overflow-y-auto pr-1">
                    <ScanBreakdown result={extraction} compact />
                  </div>
                ) : (
                  <p className="py-5 text-center text-xs text-muted">
                    Upload a photo to see energy, macros, and each item.
                  </p>
                )}
              </section>
            </>
          )}

          <LogMealSidebar
            calories={toNumber(values.calories)}
            proteinGrams={toNumber(values.proteinGrams)}
            carbGrams={toNumber(values.carbGrams)}
            fatGrams={toNumber(values.fatGrams)}
            recent={recentEntries.data?.data ?? []}
            isRecentLoading={recentEntries.isLoading && !recentEntries.data}
            onReuse={applyRecent}
          />
        </aside>
      </div>
    </form>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="14" r="3.5" />
    </svg>
  );
}
