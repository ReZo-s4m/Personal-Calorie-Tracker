'use client';

import type { GoalComparison, MacroBreakdown } from '@/lib/types';
import { presetSpanLabel, type DateRange } from './ReportRangePicker';

interface Takeaway {
  icon: 'leaf' | 'up' | 'down' | 'tip';
  text: string;
}

export function KeyTakeaways({
  breakdown,
  comparison,
  previous,
  range,
}: {
  breakdown: MacroBreakdown | null;
  comparison: GoalComparison | null;
  previous: GoalComparison | null;
  range: DateRange;
}) {
  const items = buildTakeaways(breakdown, comparison, previous, range);

  return (
    <aside className="rounded-md border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-sm bg-surface text-accent">
          <LeafIcon />
        </span>
        <h3 className="text-sm font-semibold">Key takeaways</h3>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.text} className="flex gap-2.5 text-sm text-foreground">
            <span className="mt-0.5 text-accent">
              {item.icon === 'up' ? <TrendUp /> : item.icon === 'down' ? <TrendDown /> : item.icon === 'tip' ? <Bulb /> : <LeafSmall />}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function buildTakeaways(
  breakdown: MacroBreakdown | null,
  comparison: GoalComparison | null,
  previous: GoalComparison | null,
  range: DateRange,
): Takeaway[] {
  const span = presetSpanLabel(range);
  const items: Takeaway[] = [];

  const slices = breakdown
    ? [
        { label: 'Protein', share: breakdown.caloriePercentage.proteinGrams, grams: breakdown.grams.proteinGrams },
        { label: 'Carbs', share: breakdown.caloriePercentage.carbGrams, grams: breakdown.grams.carbGrams },
        { label: 'Fat', share: breakdown.caloriePercentage.fatGrams, grams: breakdown.grams.fatGrams },
      ]
    : [];
  const strongest = [...slices].sort((a, b) => b.share - a.share)[0];

  if (strongest && strongest.grams > 0) {
    items.push({
      icon: 'leaf',
      text: `${strongest.label} intake is your strongest macro.`,
    });
  }

  if (comparison && previous && previous.daysLogged > 0 && comparison.daysLogged > 0) {
    const proteinNow = comparison.actual.proteinGrams / comparison.daysLogged;
    const proteinThen = previous.actual.proteinGrams / previous.daysLogged;
    if (proteinThen > 0) {
      const pct = Math.round(((proteinNow - proteinThen) / proteinThen) * 100);
      if (Math.abs(pct) >= 3) {
        items.push({
          icon: pct > 0 ? 'up' : 'down',
          text: `You're ${Math.abs(pct)}% ${pct > 0 ? 'higher' : 'lower'} than your previous ${span} average.`,
        });
      }
    }

    const fatNow = comparison.actual.fatGrams / comparison.daysLogged;
    const fatThen = previous.actual.fatGrams / previous.daysLogged;
    if (fatThen > 0) {
      const pct = Math.round(((fatNow - fatThen) / fatThen) * 100);
      if (pct < -3) {
        items.push({ icon: 'down', text: 'Your fat intake is lower than usual.' });
      } else if (pct > 8) {
        items.push({ icon: 'up', text: 'Your fat intake is higher than the previous range.' });
      }
    }
  }

  const dailyGoal = comparison?.target.averageDailyCalories ?? 0;
  const dailyAvg = comparison?.actual.averageDailyCalories ?? 0;
  if (dailyGoal > 0 && dailyAvg < dailyGoal * 0.9) {
    items.push({
      icon: 'tip',
      text: 'Try adding more whole foods to meet your calorie goal.',
    });
  }

  if (items.length === 0) {
    items.push({
      icon: 'tip',
      text: 'Log a few more meals in this range to unlock personalised takeaways.',
    });
  }

  return items.slice(0, 4);
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
      <path
        d="M4 14c6-1 9-5 11-10-5 1-9 4-10 10Zm0 0c2-2 5-3 8-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LeafSmall() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path d="M3.5 11c5-.8 7.5-4 9-8.5-4 .8-7 3.2-8 8.5Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function TrendUp() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path d="M3 11.5 7 7.5l2.5 2.5 4-5M10 5h3.5V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendDown() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path d="M3 5.5 7 9.5l2.5-2.5 4 5M10 12h3.5V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bulb() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path
        d="M8 2.5a4 4 0 0 0-2.2 7.3V11h4.4V9.8A4 4 0 0 0 8 2.5ZM6.5 12.5h3M7 14h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
