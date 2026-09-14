'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { easeOut, fadeUp, staggerShow } from './motion';

const CAPABILITIES = [
  {
    title: 'Meal logging',
    body: 'Name the food, set the meal type, and record calories with protein, carbs, fat, and optional micronutrients. Breakfast through snacks share one table.',
  },
  {
    title: 'Photo extract',
    body: 'A plate or a nutrition label drafts the entry. Nothing is written until you review the numbers and confirm.',
  },
  {
    title: 'Goals',
    body: 'Daily calorie and macro targets, plus an optional weight goal. Later reports compare against the targets that were in force that day.',
  },
  {
    title: 'Reports and PDF',
    body: 'Daily bars, weekly totals, macro split, and goal versus actual. The downloadable PDF uses the same figures shown on screen.',
  },
  {
    title: 'Upload a PDF',
    body: 'Drop a food-diary table, review parsed rows, then commit. A local parser runs first; Deep Dive is optional.',
  },
  {
    title: 'Ask AI',
    body: 'Log, edit, or delete meals, attach a photo or PDF, set a goal, or ask for a report in ordinary words. You still confirm the row.',
  },
];

export function FeatureCards() {
  const reduce = useReducedMotion();

  return (
    <section id="product" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-display text-lg italic text-accent">Product</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One diary. Several ways to write it.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Add Meal, Upload, and Ask AI all create the same meal row. Insights never keeps a
            second set of numbers.
          </p>
        </div>

        <motion.ul
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          variants={staggerShow}
          className="mt-10 divide-y divide-border border-y border-border"
        >
          {CAPABILITIES.map((item, index) => (
            <motion.li
              key={item.title}
              variants={reduce ? undefined : fadeUp}
              className="grid gap-2 py-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-10 sm:py-7"
            >
              <p className="text-sm font-semibold text-foreground">
                <span className="mr-3 tabular-nums text-subtle">0{index + 1}</span>
                {item.title}
              </p>
              <p className="text-sm leading-relaxed text-muted sm:text-[0.95rem]">{item.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
