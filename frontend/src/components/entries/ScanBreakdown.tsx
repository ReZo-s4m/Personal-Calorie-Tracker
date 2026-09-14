'use client';

import { formatCalories } from '@/lib/format';
import { cx } from '@/components/ui';
import type { ExtractedComponent, ExtractionResult } from '@/lib/types';

const CONFIDENCE = {
  high: { label: 'Ready to save', tone: 'text-accent' },
  medium: { label: 'Worth a quick check', tone: 'text-foreground' },
  low: { label: 'Please review', tone: 'text-danger' },
} as const;

export function ScanBreakdown({
  result,
  compact = false,
}: {
  result: ExtractionResult;
  compact?: boolean;
}) {
  const total = Math.max(result.entry.calories, 1);
  const items = result.components;
  const review = result.confidence === 'low';

  return (
    <div className="flex flex-col gap-4">
      <div className={cx('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-3')}>
        <Metric label="Energy" value={`${formatCalories(result.entry.calories)}`} unit="kcal" />
        <Metric label="Protein" value={String(Math.round(result.entry.proteinGrams))} unit="g" />
        <Metric label="Carbs / fat" value={`${Math.round(result.entry.carbGrams)} / ${Math.round(result.entry.fatGrams)}`} unit="g" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <p className="font-semibold uppercase tracking-[0.14em] text-subtle">
          {result.source === 'nutrition_label' ? 'From a label' : 'From a photo'}
        </p>
        <p className={cx('font-semibold', CONFIDENCE[result.confidence].tone)}>
          {CONFIDENCE[result.confidence].label}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <ScanItem key={`${item.name}-${item.calories}`} item={item} total={total} />
          ))}
        </ul>
      )}

      {review && (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-xs leading-relaxed text-accent">
          Some items were guessed. Edit the form before you save.
        </p>
      )}

      {result.warnings.map((warning) => (
        <p key={warning} className="text-xs leading-relaxed text-muted">
          {warning}
        </p>
      ))}

      {result.notes && !review && (
        <p className="text-xs leading-relaxed text-muted">{result.notes}</p>
      )}
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md bg-surface-raised px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-[11px] font-medium text-muted">{unit}</span>
      </p>
    </div>
  );
}

function ScanItem({ item, total }: { item: ExtractedComponent; total: number }) {
  const share = Math.min(100, Math.max(6, (item.calories / total) * 100));

  return (
    <li className="rounded-md border border-border px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="mt-0.5 text-[11px] text-subtle">
            {item.quantity} {item.unit}
            <span className="mx-1.5 text-border-strong">·</span>
            {Math.round(item.proteinGrams)}p / {Math.round(item.carbGrams)}c / {Math.round(item.fatGrams)}f
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCalories(item.calories)}
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
      </div>
    </li>
  );
}
