'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/components/ui';

interface NutritionMacroCardProps {
  label: string;
  consumed: number | null;
  target: number | null;
  unit: string;
  color: string;
  isLoading?: boolean;
  delay?: number;
  scaleMax?: number;
  className?: string;
}

export function NutritionMacroCard({
  label,
  consumed,
  target,
  unit,
  color,
  isLoading = false,
  delay = 0,
  scaleMax,
  className,
}: NutritionMacroCardProps) {
  const reduce = Boolean(useReducedMotion());
  const value = consumed ?? 0;
  const progress =
    target && target > 0
      ? Math.min(value / target, 1)
      : scaleMax && scaleMax > 0
        ? Math.min(value / scaleMax, 0.78)
        : 0;

  return (
    <motion.div
      className={cx(
        'flex flex-col justify-center px-5 py-5 transition-colors hover:bg-surface-raised/80',
        className,
      )}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-medium tracking-tight tabular-nums" style={{ color }}>
        {isLoading ? '…' : value.toLocaleString()}
        {target != null && (
          <span className="ml-1 text-sm font-medium text-subtle">/ {target.toLocaleString()}</span>
        )}
        <span className="ml-1 text-xs font-medium text-subtle">{unit}</span>
      </p>
      <div className="mt-3 h-1 overflow-hidden bg-surface-raised">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : delay + 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}
