'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui';

const CHAPTERS = [
  {
    id: 'dates',
    title: 'Keep the original dates',
    body: 'A PDF from last Tuesday still belongs on Tuesday. After import, reports use those same days.',
  },
  {
    id: 'confirm',
    title: 'Nothing saves until you commit',
    body: 'The preview is a draft table. Edit a row, drop a row, then import. Ask AI can still log or correct a meal afterwards.',
  },
  {
    id: 'one-table',
    title: 'One table, four meals',
    body: 'Breakfast, lunch, dinner, snacks. Add Meal, Ask AI, and Upload all save to the same meal list.',
  },
];

export function ImportPromo({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(CHAPTERS[0].id);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
      <ul className="divide-y divide-border border-y border-border">
        {CHAPTERS.map((chapter) => {
          const expanded = open === chapter.id;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(chapter.id)}
                className="flex w-full items-start justify-between gap-4 py-4 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold">{chapter.title}</span>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.span
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 block overflow-hidden text-sm leading-relaxed text-muted"
                      >
                        {chapter.body}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="mt-0.5 text-xs tabular-nums text-accent">{expanded ? '—' : '+'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <aside className="ink-panel flex flex-col justify-between rounded-md p-5">
        <div>
          <p className="font-display text-base italic text-[#e8b86d]">After import</p>
          <h2 className="mt-2 text-xl font-medium tracking-tight">
            {firstName ? `${firstName}, check reports next.` : 'Check reports next.'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#ebe4d8]/70">
            Daily bars and goal comparison use the rows you just committed.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/reports">
            <Button className="w-full">See reports</Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary" className="w-full">
              Open chat
            </Button>
          </Link>
        </div>
      </aside>
    </div>
  );
}
