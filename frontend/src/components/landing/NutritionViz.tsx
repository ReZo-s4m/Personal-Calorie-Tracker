'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useState, type PointerEvent } from 'react';
import { cx } from '@/components/ui';
import { duration, easeOut, formatInt, springSoft } from './motion';
import { useCountUp, useIsCoarsePointer, useIsTablet } from './useLanding';

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

const DATA = {
  calories: { current: 1842, target: 2200, unit: 'kcal', label: 'Calories' },
  protein: { current: 92, target: 120, unit: 'g', label: 'Protein' },
  carbs: { current: 184, target: 220, unit: 'g', label: 'Carbs' },
  fat: { current: 51, target: 70, unit: 'g', label: 'Fat' },
};

const NOTES: Record<MacroKey, string> = {
  calories: '358 kcal still sit inside the day. Enough for a late plate if you want it.',
  protein: '28g short of 120g. A Greek yogurt or chicken thigh closes the gap.',
  carbs: '36g under the 220g line. Fruit or rice would fill it without crowding fat.',
  fat: '19g remaining. Olive oil on the next vegetable side is enough.',
};

export function NutritionViz({ ready }: { ready: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const coarse = useIsCoarsePointer();
  const tablet = useIsTablet();
  const [selected, setSelected] = useState<MacroKey>('calories');
  const strength = reduce ? 0 : coarse ? 0.4 : tablet ? 0.55 : 1;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, springSoft);
  const sy = useSpring(py, springSoft);

  const cardX = useTransform(sx, (value) => value * 0.35);
  const cardY = useTransform(sy, (value) => value * 0.35);
  const ringX = useTransform(sx, (value) => value * 0.7);
  const ringY = useTransform(sy, (value) => value * 0.7);
  const listX = useTransform(sx, (value) => value);
  const listY = useTransform(sy, (value) => value);
  const highlightX = useTransform(sx, (value) => value * 1.15);
  const highlightY = useTransform(sy, (value) => value * 0.2);

  const calories = useCountUp(DATA.calories.current, ready, 900, reduce);
  const protein = useCountUp(DATA.protein.current, ready, 780, reduce);
  const carbs = useCountUp(DATA.carbs.current, ready, 820, reduce);
  const fat = useCountUp(DATA.fat.current, ready, 760, reduce);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!strength) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    px.set(Math.max(-1, Math.min(1, nx)) * 12 * strength);
    py.set(Math.max(-1, Math.min(1, ny)) * 9 * strength);
  }

  function onLeave() {
    px.set(0);
    py.set(0);
  }

  const size = 148;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = DATA.calories.current / DATA.calories.target;

  return (
    <motion.div
      className="relative touch-pan-y"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={ready ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: duration.enter, ease: easeOut, delay: reduce ? 0 : 0.12 }}
    >
      <motion.aside style={{ x: cardX, y: cardY }} className="overflow-hidden bg-surface">
        <div className="grid gap-6 px-5 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6">
          <motion.div style={{ x: ringX, y: ringY }} className="relative mx-auto grid place-items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth={stroke}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: ready ? circumference * (1 - progress) : circumference }}
                transition={{ duration: reduce ? 0 : 0.95, ease: easeOut, delay: 0.18 }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatInt(calories)}</p>
                <p className="text-[11px] text-subtle">of {formatInt(DATA.calories.target)} kcal</p>
              </div>
            </div>
          </motion.div>

          <motion.div style={{ x: listX, y: listY }} className="space-y-1">
            {(
              [
                ['protein', protein],
                ['carbs', carbs],
                ['fat', fat],
              ] as const
            ).map(([key, value]) => (
              <MacroRow
                key={key}
                id={key}
                value={value}
                selected={selected}
                ready={ready}
                reduce={reduce}
                onSelect={setSelected}
              />
            ))}
          </motion.div>
        </div>

        <motion.div
          style={{ x: highlightX, y: highlightY }}
          className="border-t border-border bg-surface-raised px-5 py-4 sm:px-6"
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{DATA[selected].label}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{NOTES[selected]}</p>
        </motion.div>
      </motion.aside>
    </motion.div>
  );
}

function MacroRow({
  id,
  value,
  selected,
  ready,
  reduce,
  onSelect,
}: {
  id: Exclude<MacroKey, 'calories'>;
  value: number;
  selected: MacroKey;
  ready: boolean;
  reduce: boolean;
  onSelect: (key: MacroKey) => void;
}) {
  const item = DATA[id];
  const active = selected === id;
  const muted = selected !== 'calories' && !active;
  const width = `${(item.current / item.target) * 100}%`;

  return (
    <button
      type="button"
      onClick={() => onSelect(active ? 'calories' : id)}
      onPointerEnter={() => {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          onSelect(id);
        }
      }}
      className={cx(
        'w-full rounded-xl px-3 py-2.5 text-left transition-[opacity,background-color] duration-300',
        active ? 'bg-accent-soft' : 'hover:bg-surface-raised',
        muted && 'opacity-35',
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium">{item.label}</span>
        <span className="tabular-nums text-muted">
          {formatInt(value)}
          <span className="text-subtle">
            {' '}
            / {item.target}
            {item.unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <motion.div
          className={cx('h-full rounded-full', id === 'protein' && 'bg-protein', id === 'carbs' && 'bg-carbs', id === 'fat' && 'bg-fat')}
          initial={{ width: 0 }}
          animate={{ width: ready ? width : 0 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: easeOut, delay: id === 'protein' ? 0.2 : id === 'carbs' ? 0.28 : 0.36 }}
        />
      </div>
    </button>
  );
}
