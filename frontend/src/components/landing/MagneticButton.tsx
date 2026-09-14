'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import type { PointerEvent, ReactNode } from 'react';
import { cx } from '@/components/ui';
import { springMagnet } from './motion';
import { useIsCoarsePointer } from './useLanding';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ink';

const STYLES: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover shadow-[0_1px_0_rgb(0_0_0/0.08)]',
  secondary:
    'border border-border-strong bg-surface text-foreground hover:bg-surface-raised',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-raised',
  ink: 'bg-accent text-on-accent hover:bg-accent-hover',
};

export function MagneticButton({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const coarse = useIsCoarsePointer();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springMagnet);
  const springY = useSpring(y, springMagnet);
  const magnetic = !reduce && !coarse;

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!magnetic) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-5, Math.min(5, dx * 0.18)));
    y.set(Math.max(-5, Math.min(5, dy * 0.18)));
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className={cx('inline-flex w-full sm:w-auto', className)}
      style={{ x: magnetic ? springX : 0, y: magnetic ? springY : 0 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <Link href={href} className="w-full sm:w-auto">
        <motion.span
          className={cx(
            'inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold sm:w-auto',
            'transition-colors duration-200',
            STYLES[variant],
          )}
          whileHover={reduce ? undefined : { y: -1, scale: 1.015 }}
          whileTap={reduce ? undefined : { scale: 0.98, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.span>
      </Link>
    </motion.div>
  );
}
