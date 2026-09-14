'use client';

import { cx } from '@/components/ui';

export function TargetSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  accent,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  accent: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const display =
    Number.isInteger(step) && step >= 1 ? Math.round(value).toLocaleString() : String(value);

  return (
    <div
      className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_7.5rem] sm:gap-4"
      style={{ ['--slider-accent' as string]: accent }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      <div className="min-w-0">
        <div className="relative h-2">
          <div className="absolute inset-0 rounded-full bg-surface-raised" />
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%`, background: accent }}
          />
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className={cx(
              'absolute inset-0 w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
              '[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--slider-accent)]',
              '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[var(--slider-accent)]',
              '[&::-moz-range-thumb]:bg-white',
            )}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-subtle">
          <span>
            {min.toLocaleString()} {unit}
          </span>
          <span>
            {max.toLocaleString()} {unit}
          </span>
        </div>
      </div>

      <p className="text-sm font-semibold tabular-nums sm:text-right">
        {display} {unit}
        {hint ? <span className="ml-1 font-normal text-subtle">({hint})</span> : null}
      </p>
    </div>
  );
}
