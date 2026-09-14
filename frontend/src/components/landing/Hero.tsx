'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { duration, easeOut } from './motion';
import { MagneticButton } from './MagneticButton';
import { NutritionViz } from './NutritionViz';

export function Hero() {
  const reduce = Boolean(useReducedMotion());
  const [ready, setReady] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setReady(true);
      return;
    }
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, [reduce]);

  return (
    <section className="relative px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: easeOut }}
            className="font-display text-lg italic text-accent"
          >
            Track meals. Stay on goal.
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: easeOut, delay: reduce ? 0 : 0.06 }}
            className="mt-4 max-w-xl text-[2.4rem] font-medium leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]"
          >
            Log your meals.
            <span className="mt-1 block text-muted">See the calories add up.</span>
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: easeOut, delay: reduce ? 0 : 0.14 }}
            className="mt-5 max-w-md text-base leading-relaxed text-muted"
          >
            NutriAI keeps calories and macros in one private table — typed, photographed, imported,
            or asked through Ask AI. Drafts wait for you. Reports never invent a second total.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.fast, ease: easeOut, delay: reduce ? 0 : 0.22 }}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <MagneticButton href="/signup">Sign up</MagneticButton>
            <MagneticButton href="#product" variant="secondary">
              See the product
            </MagneticButton>
          </motion.div>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-display text-sm italic text-muted">Today · sample</span>
            <span className="text-[11px] tabular-nums text-subtle">1,750 kcal</span>
          </div>
          <NutritionViz ready={ready} />
        </div>
      </div>
    </section>
  );
}
