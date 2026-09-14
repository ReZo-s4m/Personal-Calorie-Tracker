'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui';
import { duration, easeOut, formatInt } from './motion';
import { useCountUp, useTypedText } from './useLanding';

export type FeatureArt = 'plate' | 'photo' | 'gauge' | 'chart' | 'pdf' | 'chat';

export function FeatureIcon({ kind }: { kind: FeatureArt }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
      <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
        {kind === 'plate' && (
          <>
            <ellipse cx="10" cy="12.2" rx="6.2" ry="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.8 12.2c0 2.6 2.8 4 6.2 4s6.2-1.4 6.2-4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15.6 5.2v6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'photo' && (
          <>
            <rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="9.2" r="1.3" fill="currentColor" />
            <path d="M3.8 14.2 8 10.6l3 2.4 2.2-1.8 3 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </>
        )}
        {kind === 'gauge' && (
          <>
            <path d="M4 13a6 6 0 1 1 12 0" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 13 13.2 9.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {kind === 'chart' && (
          <>
            <path d="M3.5 16V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3.5 16h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6.5 12.5v3.5M10 8.5v7.5M13.5 10.5v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {kind === 'pdf' && (
          <>
            <path d="M6 3.5h5l4 4V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 3.5V8h4" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {kind === 'chat' && (
          <path d="M4 5.2h12v7.4H9.2L6 15.4v-2.8H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

export function FeatureVisual({ kind, active, hovered = false }: { kind: FeatureArt; active: boolean; hovered?: boolean }) {
  return (
    <div className="relative h-48 overflow-hidden border-b border-border bg-surface-raised">
      {kind === 'plate' && <MealLogArt active={active} />}
      {kind === 'photo' && <PhotoArt active={active} hovered={hovered} />}
      {kind === 'gauge' && <MacroArt active={active} />}
      {kind === 'chart' && <ReportArt active={active} />}
      {kind === 'pdf' && <PdfArt active={active} />}
      {kind === 'chat' && <ChatArt active={active} />}
    </div>
  );
}

function MealLogArt({ active }: { active: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const [stage, setStage] = useState(0);
  const total = useCountUp(stage >= 3 ? 1750 : stage >= 2 ? 1030 : stage >= 1 ? 420 : 0, true, 420, reduce);

  useEffect(() => {
    if (reduce) {
      setStage(3);
      return;
    }
    if (!active) {
      setStage(0);
      return;
    }
    const timers = [80, 280, 560, 820].map((ms, index) => window.setTimeout(() => setStage(index + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [active, reduce]);

  const rows = [
    { meal: 'Breakfast', name: 'Oatmeal', kcal: '420', show: stage >= 1 },
    { meal: 'Lunch', name: 'Chicken salad', kcal: '610', show: stage >= 2 },
    { meal: 'Dinner', name: 'Salmon bowl', kcal: '720', show: stage >= 3, accent: true },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-2 px-4" aria-hidden>
      {rows.map((row, index) => (
        <motion.div
          key={row.meal}
          initial={false}
          animate={
            row.show
              ? { opacity: 1, x: 0, backgroundColor: row.accent ? 'var(--accent-soft)' : 'var(--surface)' }
              : { opacity: 0.28, x: -10, backgroundColor: 'var(--surface)' }
          }
          transition={{ duration: 0.32, ease: easeOut, delay: reduce ? 0 : index * 0.04 }}
          className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{row.meal}</p>
            <p className="truncate text-xs font-medium">{row.show ? row.name : '—'}</p>
          </div>
          <p className={cx('text-xs tabular-nums', row.accent && row.show ? 'font-semibold text-accent' : 'text-muted')}>
            {row.show ? row.kcal : '0'}
          </p>
        </motion.div>
      ))}
      <p className="pt-1 text-right text-[11px] tabular-nums text-subtle">{formatInt(total)} kcal today</p>
    </div>
  );
}

function PhotoArt({ active, hovered }: { active: boolean; hovered: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduce) {
      setStage(4);
      return;
    }
    if (!active) {
      setStage(0);
      return;
    }
    const timers = [160, 520, 920, 1280].map((ms, index) => window.setTimeout(() => setStage(index + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [active, reduce]);

  const foods = ['Grilled chicken', 'Rice', 'Broccoli'];

  return (
    <div className="relative h-full" aria-hidden>
      <motion.div
        className="absolute inset-0"
        animate={{ scale: hovered ? 1.05 : 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <Image src="/brand/hero-bowl.png" alt="" fill sizes="(min-width: 1280px) 28vw, 90vw" className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />

      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        <span className="rounded-full bg-surface/95 px-2 py-0.5 text-[10px] font-medium">
          {stage === 0 && 'Ready'}
          {stage === 1 && 'Analyzing image…'}
          {stage >= 2 && stage < 4 && 'Food detected'}
          {stage >= 4 && 'Nutrition extracted'}
        </span>
        {stage === 1 && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
      </div>

      <div className="absolute inset-x-3 bottom-3 space-y-1.5">
        {stage >= 2 && stage < 4 && (
          <div className="flex flex-wrap gap-1">
            {foods.map((food, index) => (
              <motion.span
                key={food}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.28 }}
                className="rounded-full bg-surface/95 px-2 py-0.5 text-[10px] font-medium"
              >
                {food}
              </motion.span>
            ))}
          </div>
        )}
        {stage >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-surface/95 px-2.5 py-2 text-[10px] leading-relaxed"
          >
            <p className="font-medium">Calories 642 · P 48 · C 54 · F 21</p>
            {stage >= 4 && <p className="mt-1 font-medium text-accent">Add to diary</p>}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MacroArt({ active }: { active: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const [focus, setFocus] = useState<'protein' | 'carbs' | 'fat'>('protein');
  const bars = [
    { id: 'protein' as const, label: 'Protein', value: 92, max: 120, tone: 'bg-protein' },
    { id: 'carbs' as const, label: 'Carbs', value: 184, max: 220, tone: 'bg-carbs' },
    { id: 'fat' as const, label: 'Fat', value: 51, max: 70, tone: 'bg-fat' },
  ];

  useEffect(() => {
    if (!active || reduce) return;
    const order = ['protein', 'carbs', 'fat'] as const;
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % order.length;
      setFocus(order[i]);
    }, 1100);
    return () => window.clearInterval(id);
  }, [active, reduce]);

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5" aria-hidden>
      {bars.map((bar) => {
        const on = focus === bar.id;
        return (
          <button
            key={bar.label}
            type="button"
            onClick={() => setFocus(bar.id)}
            className={cx('text-left transition-opacity duration-300', active && !on && 'opacity-40')}
          >
            <div className="mb-1 flex items-baseline justify-between text-[11px]">
              <span className={on ? 'font-medium text-foreground' : 'text-muted'}>{bar.label}</span>
              <span className="tabular-nums text-subtle">
                {bar.value}
                <span> / {bar.max}g</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                className={cx('h-full rounded-full', bar.tone)}
                initial={{ width: 0 }}
                animate={{ width: active || reduce ? `${(bar.value / bar.max) * 100}%` : '8%' }}
                transition={{ duration: 0.55, ease: easeOut }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

const WEEK = [
  { key: 'M', kcal: 1980, protein: 108, carbs: 205, fat: 58 },
  { key: 'T', kcal: 2140, protein: 121, carbs: 228, fat: 64 },
  { key: 'W', kcal: 1760, protein: 96, carbs: 180, fat: 51 },
  { key: 'T2', kcal: 2320, protein: 118, carbs: 250, fat: 72 },
  { key: 'F', kcal: 2050, protein: 112, carbs: 210, fat: 61 },
  { key: 'S', kcal: 2410, protein: 125, carbs: 268, fat: 78 },
  { key: 'S2', kcal: 1842, protein: 92, carbs: 184, fat: 51 },
];

function ReportArt({ active }: { active: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const [metric, setMetric] = useState<'kcal' | 'protein' | 'carbs' | 'fat'>('kcal');
  const [day, setDay] = useState(6);
  const max = { kcal: 2500, protein: 140, carbs: 280, fat: 90 }[metric];
  const selected = WEEK[day];
  const value = selected[metric];

  return (
    <div className="flex h-full flex-col justify-end px-4 pb-3 pt-3" aria-hidden>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMetric(item)}
              className={cx(
                'rounded-full px-2 py-0.5 text-[10px] capitalize transition-colors',
                metric === item ? 'bg-foreground text-background' : 'text-subtle hover:text-foreground',
              )}
            >
              {item === 'kcal' ? 'Calories' : item}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold tabular-nums">
          {formatInt(value)}
          {metric === 'kcal' ? ' kcal' : 'g'}
        </p>
      </div>
      <div className="flex h-[4.6rem] items-end gap-1.5">
        {WEEK.map((entry, index) => {
          const height = `${(entry[metric] / max) * 100}%`;
          const on = index === day;
          return (
            <button
              key={entry.key + index}
              type="button"
              onPointerEnter={() => setDay(index)}
              onClick={() => setDay(index)}
              className="flex h-full flex-1 items-end"
            >
              <motion.span
                className={cx('block w-full rounded-sm', on ? 'bg-accent' : 'bg-foreground/80')}
                initial={{ height: 8 }}
                animate={{ height: active || reduce ? height : 8 }}
                transition={{ duration: 0.4, ease: easeOut }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PdfArt({ active }: { active: boolean }) {
  const rows = [
    { name: 'Overnight oats', kcal: '380' },
    { name: 'Turkey wrap', kcal: '540' },
    { name: 'Lentil soup', kcal: '310' },
  ];

  return (
    <div className="flex h-full items-center gap-3 px-4" aria-hidden>
      <motion.div
        animate={active ? { x: -6, y: -2, rotate: -2 } : { x: 0, y: 0, rotate: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
        className="w-[42%] rounded-lg border border-border bg-surface px-3 py-3 shadow-[0_8px_18px_rgb(28_27_24/0.06)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">PDF</span>
          <span className="text-[10px] text-subtle">14 rows</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/70" />
          <div className="h-1.5 w-full rounded-full bg-border" />
          <div className="h-1.5 w-2/3 rounded-full bg-accent/70" />
        </div>
      </motion.div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {rows.map((row, index) => (
          <motion.div
            key={row.name}
            initial={false}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={{ duration: 0.32, delay: index * 0.07, ease: easeOut }}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-2 py-1.5"
          >
            <p className="truncate text-[10px] font-medium">{row.name}</p>
            <p className="text-[10px] tabular-nums text-muted">{row.kcal}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const CHAT = {
  question: 'How much protein do I need today?',
  answer: "You're at 92g of your 120g target.",
};

function ChatArt({ active }: { active: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const typed = useTypedText(CHAT.answer, active, reduce, 12);

  return (
    <div className="flex h-full flex-col justify-center gap-2 px-4" aria-hidden>
      <motion.div
        initial={false}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0.45, y: 6 }}
        className="max-w-[88%] rounded-sm bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted"
      >
        {CHAT.question}
      </motion.div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-auto max-w-[90%] rounded-sm bg-accent-soft px-3 py-2 text-[11px] leading-relaxed"
          >
            {typed}
            {typed.length < CHAT.answer.length && <span className="ml-0.5 inline-block h-3 w-px bg-foreground/70" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: duration.base, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
