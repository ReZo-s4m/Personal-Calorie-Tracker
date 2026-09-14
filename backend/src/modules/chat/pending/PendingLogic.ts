import { fromDateKey } from '../../../common/dates.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';
import type { ChatAction } from '../models/chat.models.js';
import {
  NO_REPLY,
  YES_REPLY,
  createPending,
  describePending,
  isPendingExpired,
} from './pending.factory.js';
import type { PendingAction, PendingChoice, PendingOutcome } from './pending.models.js';
import { hintFromText, resolveAmong, toEntryRef, type EntryRef, type ResolveHint } from './resolve.js';

/**
 * Resolves the question a tool left open: which of these meals did you mean,
 * and are you sure about deleting all of them.
 */
export class PendingLogic {
  constructor(private readonly entriesLogic: IEntriesLogic) {}

  /** Loads the candidates a hint points at. Shared with the tool-side resolver. */
  async loadEntries(userId: string, hint: ResolveHint): Promise<EntryRef[]> {
    const from = hint.from ?? hint.to;
    const to = hint.to ?? hint.from;

    const { data } = await this.entriesLogic.listEntries(userId, {
      from: from ? fromDateKey(from) : undefined,
      to: to ? fromDateKey(to) : undefined,
      mealType: hint.mealType,
      search: hint.search,
      sort: 'consumedAt',
      order: 'asc',
      page: 1,
      pageSize: 50,
    });

    return data.map(toEntryRef);
  }

  async applyPending(
    userId: string,
    pending: PendingAction,
    text: string,
    choice?: PendingChoice,
  ): Promise<PendingOutcome> {
    if (isPendingExpired(pending)) {
      return {
        reply: 'That choice expired. Ask me again and I will look the meals up fresh.',
        actions: [],
        pendingAction: null,
      };
    }

    if (pending.kind === 'confirm_bulk_delete') {
      return this.applyBulk(userId, pending, text, choice);
    }

    const picked = this.pickCandidate(pending.candidates, text, choice);

    if (picked.status === 'none') {
      return {
        reply: `I could not tell which meal you meant.\n\n${describePending(pending)}`,
        actions: [],
        pendingAction: pending,
      };
    }

    if (picked.status === 'many') {
      const narrowed = createPending(
        pending.kind,
        pending.originalRequest,
        picked.entries,
        pending.patch,
      );
      return { reply: describePending(narrowed), actions: [], pendingAction: narrowed };
    }

    if (pending.kind === 'choose_update') {
      const entry = await this.entriesLogic.updateEntry(
        userId,
        picked.entry.entryId,
        pending.patch ?? {},
      );

      return {
        reply: `Updated ${entry.foodName} — ${Math.round(entry.calories)} kcal, ${entry.mealType} on ${entry.consumedOn}.`,
        actions: [
          {
            tool: 'update_entry',
            type: 'meal_updated',
            label: `Updated ${entry.foodName} — ${Math.round(entry.calories)} kcal`,
            entryId: entry.id,
          },
        ],
        pendingAction: null,
      };
    }

    const entry = await this.entriesLogic.getEntry(userId, picked.entry.entryId);
    await this.entriesLogic.deleteEntry(userId, picked.entry.entryId);

    return {
      reply: `Removed your ${entry.mealType} from ${entry.consumedOn} — ${entry.foodName}, ${entry.quantity} ${entry.unit}, ${Math.round(entry.calories)} kcal.`,
      actions: [
        {
          tool: 'delete_entry',
          type: 'meal_deleted',
          label: `Deleted ${entry.foodName} from ${entry.consumedOn}`,
          entryId: entry.id,
        },
      ],
      pendingAction: null,
    };
  }

  private async applyBulk(
    userId: string,
    pending: PendingAction,
    text: string,
    choice?: PendingChoice,
  ): Promise<PendingOutcome> {
    if (choice?.confirm === false || NO_REPLY.test(text.trim())) {
      return { reply: 'Okay, I left those meals as they are.', actions: [], pendingAction: null };
    }

    if (choice?.confirm !== true && !YES_REPLY.test(text.trim())) {
      return { reply: describePending(pending), actions: [], pendingAction: pending };
    }

    const actions: ChatAction[] = [];

    for (const candidate of pending.candidates) {
      await this.entriesLogic.deleteEntry(userId, candidate.entryId);
      actions.push({
        tool: 'delete_entry',
        type: 'meal_deleted',
        label: `Deleted ${candidate.foodName} from ${candidate.consumedOn}`,
        entryId: candidate.entryId,
      });
    }

    return {
      reply: `Deleted ${actions.length} meal ${actions.length === 1 ? 'entry' : 'entries'}.`,
      actions,
      pendingAction: null,
    };
  }

  private pickCandidate(
    candidates: EntryRef[],
    text: string,
    choice?: PendingChoice,
  ): ReturnType<typeof resolveAmong> {
    if (choice?.entryId) {
      const found = candidates.find((entry) => entry.entryId === choice.entryId);
      return found ? { status: 'one', entry: found } : { status: 'none' };
    }

    const hint = hintFromText(text);
    if (choice?.index) {
      hint.index = choice.index;
    }

    return resolveAmong(candidates, hint);
  }
}
