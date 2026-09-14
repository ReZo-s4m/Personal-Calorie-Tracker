'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, staggerShow } from './motion';

const STEPS = [
  {
    n: '1',
    title: 'Create an account',
    body: 'Sign up with a name, email and password. Each account only sees its own meals, goals and weigh-ins.',
  },
  {
    n: '2',
    title: 'Set daily targets',
    body: 'Calories, protein, carbs and fat, with an optional weight goal. Saving again that day replaces the version in force.',
  },
  {
    n: '3',
    title: 'Log the day',
    body: 'Type a meal, photograph a plate, upload a diary PDF, or ask AI. Confirm drafts before they save.',
  },
  {
    n: '4',
    title: 'Review the record',
    body: 'Overview shows remaining calories. Insights charts the week and exports a PDF from the same table.',
  },
];

export function HowItWorks() {
  const reduce = Boolean(useReducedMotion());

  return (
    <section id="workflow" className="border-t border-border px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-lg italic text-accent">How it works</p>
        <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          Four steps from signup to a report you can keep.
        </h2>
        <motion.ol
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerShow}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.n}
              variants={reduce ? undefined : fadeUp}
              className="rounded-md border border-border bg-surface p-5"
            >
              <p className="grid size-8 place-items-center rounded-sm bg-accent text-sm font-semibold text-on-accent">
                {step.n}
              </p>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
