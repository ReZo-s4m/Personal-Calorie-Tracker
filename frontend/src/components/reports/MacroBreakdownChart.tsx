'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCalories, formatGrams } from '@/lib/format';
import type { MacroBreakdown } from '@/lib/types';

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 16px rgb(17 17 19 / 0.08)',
};

export function MacroBreakdownChart({
  breakdown,
  totalCalories,
}: {
  breakdown: MacroBreakdown;
  totalCalories?: number;
}) {
  const slices = [
    {
      label: 'Protein',
      grams: breakdown.grams.proteinGrams,
      share: breakdown.caloriePercentage.proteinGrams,
      color: 'var(--protein)',
    },
    {
      label: 'Carbs',
      grams: breakdown.grams.carbGrams,
      share: breakdown.caloriePercentage.carbGrams,
      color: 'var(--carbs)',
    },
    {
      label: 'Fat',
      grams: breakdown.grams.fatGrams,
      share: breakdown.caloriePercentage.fatGrams,
      color: 'var(--fat)',
    },
  ];

  const totalGrams = slices.reduce((sum, slice) => sum + slice.grams, 0);
  const energy =
    totalCalories ??
    Math.round(
      breakdown.grams.proteinGrams * 4 + breakdown.grams.carbGrams * 4 + breakdown.grams.fatGrams * 9,
    );

  if (totalGrams === 0) {
    return <p className="py-12 text-center text-sm text-muted">No macros logged in this range.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="share"
              nameKey="label"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [
                typeof value === 'number' ? `${value}% of energy` : '—',
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold tabular-nums leading-none">{formatCalories(energy)}</p>
          <p className="mt-1 text-[11px] text-subtle">kcal</p>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {slices.map((slice) => (
          <li key={slice.label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 text-sm">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: slice.color }} />
            <span className="text-muted">{slice.label}</span>
            <span className="tabular-nums text-subtle">{formatGrams(slice.grams)} g</span>
            <span className="w-16 text-right font-semibold tabular-nums">{slice.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
