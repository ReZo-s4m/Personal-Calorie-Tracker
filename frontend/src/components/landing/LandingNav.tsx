'use client';

import Link from 'next/link';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { cx } from '@/components/ui';
import { duration, easeOut } from './motion';

export const LANDING_NAV = [
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
];

export function LandingNav() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 12);
  });

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easeOut }}
      className={cx(
        'sticky top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-200',
        scrolled ? 'border-b border-border bg-[#1a1614]/95 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="NutriAI">
          <BrandMark size={26} tone="paper" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Marketing">
          {LANDING_NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors duration-200 hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="rounded-sm px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-sm bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Sign up
          </Link>
        </div>
      </div>
      <nav
        className="flex gap-5 overflow-x-auto border-t border-border/80 px-4 py-2 text-sm text-muted md:hidden"
        aria-label="Sections"
      >
        {LANDING_NAV.map((item) => (
          <a key={item.href} href={item.href} className="whitespace-nowrap hover:text-foreground">
            {item.label}
          </a>
        ))}
      </nav>
    </motion.header>
  );
}
