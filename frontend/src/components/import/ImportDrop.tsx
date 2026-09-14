'use client';

import { useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge, Button, cx } from '@/components/ui';

const ACCEPT = 'application/pdf';

const STAGES = [
  { n: '1', title: 'Drop', body: 'A PDF diary, a clinic report, or a week of meals.' },
  { n: '2', title: 'Map', body: 'A local script fills the table first. Nothing is saved yet.' },
  { n: '3', title: 'Edit', body: 'Fix a name, a date, or a calorie. Then commit the rows.' },
];

export function ImportDrop({
  inputRef,
  isParsing,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  isParsing: boolean;
  onFile: (file: File | null) => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const [hover, setHover] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,20rem)]">
      <motion.label
        htmlFor="bulk-import-file"
        onDragOver={(event) => {
          event.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(event) => {
          event.preventDefault();
          setHover(false);
          onFile(event.dataTransfer.files[0] ?? null);
        }}
        animate={{
          scale: hover && !reduce ? 1.01 : 1,
          borderColor: hover ? 'var(--accent)' : 'var(--border-strong)',
        }}
        className={cx(
          'relative flex min-h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-surface px-6 py-12 text-center sm:min-h-[26rem]',
          isParsing && 'pointer-events-none opacity-70',
        )}
      >
        <motion.span
          aria-hidden
          animate={{ opacity: hover ? 0.18 : 0.08 }}
          className="pointer-events-none absolute inset-8 rounded-md bg-accent"
        />
        <motion.span
          animate={{ y: isParsing ? [0, -6, 0] : 0 }}
          transition={isParsing ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : undefined}
          className="relative grid size-16 place-items-center rounded-sm bg-accent text-on-accent"
        >
          <PdfMark />
        </motion.span>
        <p className="relative mt-5 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {isParsing ? 'Reading the pages…' : hover ? 'Release to open it' : 'Lay the PDF on the desk'}
        </p>
        <p className="relative mt-2 max-w-sm text-sm text-muted">
          {isParsing
            ? 'A local script fills the table. You still confirm before anything is written.'
            : 'Click to browse, or drag a file here. PDF, up to 10 MB.'}
        </p>
        <input
          id="bulk-import-file"
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </motion.label>

      <ol className="flex flex-col justify-center gap-0">
        {STAGES.map((stage, index) => (
          <motion.li
            key={stage.n}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="border-t border-border py-4 first:border-t-0"
          >
            <p className="font-display text-lg italic text-accent">{stage.n}</p>
            <h2 className="mt-1 text-base font-medium">{stage.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{stage.body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function ImportFileRail({
  fileName,
  isParsing,
  method,
  summary,
  deepAvailable,
  onDeepAnalyse,
  onReset,
}: {
  fileName: string;
  isParsing: boolean;
  method: 'script' | 'gemini' | null;
  summary: string;
  deepAvailable: boolean;
  onDeepAnalyse: () => void;
  onReset: () => void;
}) {
  return (
    <motion.div
      layout
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-5 py-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{fileName}</p>
          <Badge tone={method === 'gemini' ? 'accent' : 'neutral'}>
            {isParsing ? 'Working' : method === 'gemini' ? 'Gemini' : 'Script'}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{summary}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {deepAvailable && (
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={onDeepAnalyse}
            isLoading={isParsing}
            disabled={isParsing}
          >
            Deep analyse
          </Button>
        )}
        <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={onReset}>
          Start over
        </Button>
      </div>
    </motion.div>
  );
}

function PdfMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden>
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
