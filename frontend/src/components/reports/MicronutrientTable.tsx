'use client';

import { formatAmount } from '@/lib/format';
import type { MicronutrientRow } from '@/lib/types';

export function MicronutrientTable({ rows, days }: { rows: MicronutrientRow[]; days: number }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="grid size-12 place-items-center rounded-sm bg-accent-soft text-accent">
          <LeafIcon />
        </span>
        <p className="mt-3 text-sm font-medium">No micronutrients recorded in this range.</p>
        <p className="mt-1 max-w-sm text-xs text-subtle">
          They are filled in automatically when you log a meal from a photo.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <caption className="caption-bottom pt-3 text-left text-xs text-subtle">
        Averaged over all {days} days in the range, including days with nothing logged.
      </caption>
      <thead>
        <tr className="border-b border-border text-left text-xs text-subtle">
          <th className="pb-2 font-medium">Nutrient</th>
          <th className="pb-2 text-right font-medium">Total</th>
          <th className="pb-2 text-right font-medium">Average per day</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.nutrient} className="border-b border-border last:border-0">
            <td className="py-2">{row.label}</td>
            <td className="py-2 text-right tabular-nums">
              {formatAmount(row.total)} {row.unit}
            </td>
            <td className="py-2 text-right tabular-nums text-subtle">
              {formatAmount(row.averagePerDay)} {row.unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
      <path
        d="M5 16c8-1.5 12-6.5 14-13-7 1.5-12 5.5-13 13Zm0 0c2.5-2.5 6.5-4 10.5-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
