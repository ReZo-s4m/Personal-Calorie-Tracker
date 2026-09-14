import { badRequest } from '../../../common/errors.js';
import { createPending, describePending } from '../pending/pending.factory.js';
import type { PendingAction } from '../pending/pending.models.js';
import type { PendingLogic } from '../pending/PendingLogic.js';
import { resolveAmong, type EntryRef } from '../pending/resolve.js';
import type { ToolContext } from './IChatTool.js';
import { readDateKey, readMealType, readNumber, readString } from './tool-args.js';

/**
 * Turns "the rice from yesterday" into one entry id, or into the question the
 * user has to answer first. Shared by update_entry and delete_entry.
 */
export class TargetResolver {
  constructor(private readonly pendingLogic: PendingLogic) {}

  async resolve(
    args: Record<string, unknown>,
    context: ToolContext,
    verb: 'change' | 'remove' | 'delete_all',
  ): Promise<{ entryId?: string; entries?: EntryRef[]; pending?: PendingAction; result?: unknown }> {
    const entryId = readString(args, 'entryId');

    if (entryId) {
      return { entryId };
    }

    const from = readDateKey(args, 'from') ?? context.today;
    const to = readDateKey(args, 'to') ?? from;
    const entries = await this.pendingLogic.loadEntries(context.userId, {
      from,
      to,
      mealType: readMealType(args, 'mealType'),
      search: readString(args, 'search'),
      calories: readNumber(args, 'calories'),
    });

    if (verb === 'delete_all') {
      if (entries.length === 0) {
        throw badRequest('No meals in that range to delete.');
      }

      return { entries };
    }

    const resolved = resolveAmong(entries, {
      mealType: readMealType(args, 'mealType'),
      search: readString(args, 'search'),
      calories: readNumber(args, 'calories'),
    });

    if (resolved.status === 'none') {
      throw badRequest('No matching meal was found.');
    }

    if (resolved.status === 'one') {
      return { entryId: resolved.entry.entryId };
    }

    const pending = createPending(
      verb === 'change' ? 'choose_update' : 'choose_delete',
      verb,
      resolved.entries,
      verb === 'change'
        ? {
            foodName: readString(args, 'foodName'),
            mealType: readMealType(args, 'mealType'),
            quantity: readNumber(args, 'quantity'),
            unit: readString(args, 'unit'),
            calories: readNumber(args, 'calories'),
            proteinGrams: readNumber(args, 'proteinGrams'),
            carbGrams: readNumber(args, 'carbGrams'),
            fatGrams: readNumber(args, 'fatGrams'),
          }
        : undefined,
    );

    return {
      pending,
      result: { needsChoice: true, candidates: resolved.entries, prompt: describePending(pending) },
    };
  }
}
