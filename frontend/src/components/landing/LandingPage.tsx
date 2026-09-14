'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { BrandMark } from '@/components/brand/BrandMark';
import { FeatureCards } from './FeatureCards';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingNav } from './LandingNav';
import { MagneticButton } from './MagneticButton';
import { fadeUp, staggerShow } from './motion';

const PRINCIPLES = [
  {
    title: 'Confirm before save',
    body: 'Photo extract and PDF import produce drafts. You review the row, then commit it to the diary.',
  },
  {
    title: 'One source of truth',
    body: 'Add Meal, Ask AI, and Upload write the same meal table. Insights reads that table — it does not invent a second total.',
  },
  {
    title: 'Account isolation',
    body: 'Meals, goals and weigh-ins belong to the signed-in user. Other accounts cannot see them.',
  },
];

export function LandingPage() {
  const reduce = Boolean(useReducedMotion());

  return (
    <div className="landing min-h-dvh">
      <LandingNav />
      <main>
        <Hero />
        <div className="landing-panel">
          <FeatureCards />
          <HowItWorks />

          <section id="privacy" className="border-t border-border px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <p className="font-display text-lg italic text-accent">Kept private</p>
              <h2 className="mt-3 max-w-lg text-3xl font-medium tracking-tight sm:text-4xl">
                A personal record. Not a feed.
              </h2>
              <motion.ul
                initial={reduce ? false : 'hidden'}
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerShow}
                className="mt-10 grid gap-8 md:grid-cols-3"
              >
                {PRINCIPLES.map((item) => (
                  <motion.li
                    key={item.title}
                    variants={reduce ? undefined : fadeUp}
                    className="border-t border-border pt-5"
                  >
                    <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>
        </div>

        <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 border-t border-border pt-12 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Create your account.</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                Create an account, set a daily target, and keep a diary you can export.
              </p>
            </div>
            <MagneticButton href="/signup">Sign up</MagneticButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <Link href="/" aria-label="NutriAI">
            <BrandMark size={26} tone="paper" />
          </Link>
          <p className="text-xs text-subtle">Personal nutrition diary. Data stays on your account.</p>
        </div>
      </footer>
    </div>
  );
}
