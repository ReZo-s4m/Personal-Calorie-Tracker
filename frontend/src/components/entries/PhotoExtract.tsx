'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { errorMessage } from '@/lib/auth-context';
import { Alert, Button, cx } from '@/components/ui';
import { ScanBreakdown } from './ScanBreakdown';
import type { ExtractionResult } from '@/lib/types';

interface PhotoExtractProps {
  isAvailable: boolean;
  onApply: (result: ExtractionResult) => void;
  className?: string;
}

export function PhotoExtract({ isAvailable, onApply, className }: PhotoExtractProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setIsExtracting(true);

    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });

    try {
      const extracted = await api.ai.extract(file);
      setResult(extracted);
      onApply(extracted);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsExtracting(false);
    }
  }

  if (!isAvailable) {
    return (
      <div className={className}>
        <Alert tone="info">
          Photo scan is off on this server. You can still enter the meal by hand.
        </Alert>
      </div>
    );
  }

  return (
    <div className={cx('overflow-hidden rounded-md border border-border bg-surface-raised/60', className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Scan</p>
          <p className="mt-0.5 text-sm font-medium">Read a plate or a label</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          isLoading={isExtracting}
          onClick={() => inputRef.current?.click()}
        >
          {isExtracting ? 'Reading…' : previewUrl ? 'Replace photo' : 'Upload photo'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = '';
        }}
      />

      {previewUrl && (
        <div className="relative border-t border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Uploaded food" className="h-36 w-full object-cover" />
          {result && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent px-4 pb-3 pt-10 text-on-accent">
              <p className="text-sm font-semibold">{result.entry.foodName}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 pb-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {result && (
        <div className="max-h-[28rem] overflow-y-auto border-t border-border bg-surface px-4 py-4">
          <ScanBreakdown result={result} compact />
        </div>
      )}
    </div>
  );
}
