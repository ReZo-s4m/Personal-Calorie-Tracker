'use client';

import { addDays, parseISO } from 'date-fns';
import { DateField, Field, cx } from '@/components/ui';
import { daysAgoKey, formatDateKey, toDateKey, todayKey } from '@/lib/format';

export type ReportPreset = 'today' | '7' | '30' | '90' | 'custom';

export interface DateRange {
  from: string;
  to: string;
  preset: ReportPreset;
}

const PRESETS: { id: Exclude<ReportPreset, 'custom'>; label: string; from: () => string; to: () => string }[] =
  [
    { id: 'today', label: 'Today', from: todayKey, to: todayKey },
    { id: '7', label: 'Last 7 days', from: () => daysAgoKey(6), to: todayKey },
    { id: '30', label: 'Last 30 days', from: () => daysAgoKey(29), to: todayKey },
    { id: '90', label: 'Last 90 days', from: () => daysAgoKey(89), to: todayKey },
  ];

export function normalizeRange(from: string, to: string): { from: string; to: string } {
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

const presetRange = (id: Exclude<ReportPreset, 'custom'>): DateRange => {
  const preset = PRESETS.find((item) => item.id === id)!;
  return { preset: id, from: preset.from(), to: preset.to() };
};

export const defaultRange = (): DateRange => presetRange('30');

export function queryRange(range: DateRange): { from: string; to: string } {
  return { from: range.from, to: range.to };
}

export function rangeDays(range: DateRange): number | null {
  const { from, to } = normalizeRange(range.from, range.to);
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return Math.round((end - start) / 86_400_000) + 1;
}

export function ReportRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const isCustom = value.preset === 'custom';

  function applyCustom(from: string, to: string) {
    onChange({ preset: 'custom', ...normalizeRange(from, to) });
  }

  const chip = (selected: boolean) =>
    cx(
      'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors',
      selected
        ? 'bg-foreground font-medium text-on-accent'
        : 'bg-surface text-muted ring-1 ring-border hover:text-foreground',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={value.preset === preset.id}
            onClick={() => onChange(presetRange(preset.id))}
            className={chip(value.preset === preset.id)}
          >
            {preset.id === 'today' && <CalendarIcon />}
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => applyCustom(value.from || daysAgoKey(6), value.to || todayKey())}
          className={chip(isCustom)}
        >
          Custom
          <Chevron />
        </button>
      </div>

      {isCustom && (
        <div className="grid max-w-lg gap-3 sm:grid-cols-2">
          <Field label="From" htmlFor="report-from">
            <DateField
              id="report-from"
              value={value.from}
              onChange={(from) => applyCustom(from, value.to)}
            />
          </Field>
          <Field label="To" htmlFor="report-to">
            <DateField
              id="report-to"
              value={value.to}
              onChange={(to) => applyCustom(value.from, to)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden>
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function previousWindow(range: DateRange): { from: string; to: string } | null {
  const days = rangeDays(range);
  if (!range.from || !range.to || days == null || days < 1) {
    return null;
  }

  const start = parseISO(`${normalizeRange(range.from, range.to).from}T00:00:00`);
  const prevTo = addDays(start, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { from: toDateKey(prevFrom), to: toDateKey(prevTo) };
}

export function presetSpanLabel(range: DateRange): string {
  if (range.preset === 'today') return 'day';
  if (range.preset === '7') return '7 days';
  if (range.preset === '30') return '30 days';
  if (range.preset === '90') return '90 days';
  return 'period';
}

export function rangeLabel(range: DateRange): string {
  if (!range.from || !range.to) {
    return 'Pick both dates';
  }

  const { from, to } = normalizeRange(range.from, range.to);
  const days = rangeDays({ ...range, from, to });
  const span = `${formatDateKey(from, 'd MMM yyyy')} – ${formatDateKey(to, 'd MMM yyyy')}`;

  return days ? `${span} · ${days} ${days === 1 ? 'day' : 'days'}` : span;
}
