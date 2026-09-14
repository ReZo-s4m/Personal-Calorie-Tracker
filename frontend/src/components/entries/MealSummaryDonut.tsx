import { formatCalories, formatGrams } from '@/lib/format';

const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

export function MealSummaryDonut({
  calories,
  proteinGrams,
  carbGrams,
  fatGrams,
  showPercent = false,
}: {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  showPercent?: boolean;
}) {
  const segments = [
    { key: 'protein', label: 'Protein', grams: proteinGrams, color: 'var(--protein)' },
    { key: 'carbs', label: 'Carbs', grams: carbGrams, color: 'var(--carbs)' },
    { key: 'fat', label: 'Fat', grams: fatGrams, color: 'var(--fat)' },
  ] as const;

  const macroCalories = {
    protein: proteinGrams * CALORIES_PER_GRAM.protein,
    carbs: carbGrams * CALORIES_PER_GRAM.carbs,
    fat: fatGrams * CALORIES_PER_GRAM.fat,
  };
  const totalMacroCalories = macroCalories.protein + macroCalories.carbs + macroCalories.fat;

  const radius = 42;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-28 shrink-0 sm:size-32">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--surface-raised)"
            strokeWidth={stroke}
          />
          {totalMacroCalories > 0 &&
            segments.map((segment) => {
              const share =
                macroCalories[segment.key as keyof typeof macroCalories] / totalMacroCalories;
              const length = circumference * share;
              const circle = (
                <circle
                  key={segment.key}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold tabular-nums leading-none">{formatCalories(calories)}</p>
          <p className="mt-1 text-[11px] text-subtle">kcal</p>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {segments.map((segment) => {
          const percent =
            totalMacroCalories > 0
              ? Math.round(
                  (macroCalories[segment.key as keyof typeof macroCalories] / totalMacroCalories) *
                    100,
                )
              : 0;
          return (
            <li key={segment.key} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
              <span className="min-w-0 flex-1 text-muted">
                {segment.label}
                <span className="text-subtle"> ({formatGrams(segment.grams)}g)</span>
              </span>
              {showPercent && (
                <span className="w-8 text-right text-xs tabular-nums text-subtle">{percent}%</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
