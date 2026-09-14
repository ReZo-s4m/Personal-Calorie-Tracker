import { hintFromText } from './resolve.js';
import type { EntryRef } from './resolve.js';
import type { PendingAction, PendingKind } from './pending.models.js';

const PENDING_TTL_MS = 10 * 60 * 1000;

export function isPendingExpired(pending: PendingAction, now = Date.now()): boolean {
  return Date.parse(pending.expiresAt) <= now;
}

export function createPending(
  kind: PendingKind,
  originalRequest: string,
  candidates: EntryRef[],
  patch?: PendingAction['patch'],
): PendingAction {
  return {
    kind,
    originalRequest,
    candidates,
    patch,
    expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
  };
}

export function describePending(pending: PendingAction): string {
  if (pending.kind === 'confirm_extract') {
    return 'I have a photo draft ready. Tell me what to change, or say when to log it.';
  }

  if (pending.kind === 'review_import') {
    return 'I have a PDF draft ready. Tell me a row and column to change, or say when to log these.';
  }

  if (pending.kind === 'confirm_bulk_delete') {
    const day = pending.candidates[0]?.consumedOn ?? 'that day';
    return `That will remove ${pending.candidates.length} meal ${
      pending.candidates.length === 1 ? 'entry' : 'entries'
    } from ${day}. Should I go ahead?`;
  }

  const verb = pending.kind === 'choose_update' ? 'change' : 'remove';
  const lines = pending.candidates.map((entry, index) => formatCandidate(index + 1, entry));

  return `I found ${pending.candidates.length} meals.\n\n${lines.join('\n')}\n\nWhich one should I ${verb}?`;
}

export function formatCandidate(index: number, entry: EntryRef): string {
  const meal = entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1);
  return `${index}. ${meal} — ${entry.foodName} — ${entry.quantity} ${entry.unit} — ${Math.round(entry.calories)} kcal`;
}

const YES = /^(yes|y|ok|okay|proceed|confirm|do it|go ahead)$/i;
const NO = /^(no|n|cancel|stop|don't|do not)$/i;

export function looksLikePendingReply(text: string, pending: PendingAction): boolean {
  const trimmed = text.trim();

  if (trimmed.length > 80) {
    return false;
  }

  if (YES.test(trimmed) || NO.test(trimmed)) {
    return true;
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    return true;
  }

  const hint = hintFromText(trimmed);
  if (hint.mealType || hint.search || hint.index) {
    return true;
  }

  return pending.candidates.some((entry) =>
    trimmed.toLowerCase().includes(entry.foodName.toLowerCase()),
  );
}


export const YES_REPLY = YES;
export const NO_REPLY = NO;

/** Drafts wait on the user rather than on a choice between rows. */
export function isAttachPending(pending: PendingAction): boolean {
  return pending.kind === 'confirm_extract' || pending.kind === 'review_import';
}
