import { MEAL_TYPES } from '../../../common/nutrition.js';
import { badRequest } from '../../../common/errors.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';
import { TargetResolver } from './TargetResolver.js';
import type { ChatAction } from '../models/chat.models.js';
import { createPending } from '../pending/pending.factory.js';

export class DeleteEntryTool implements IChatTool {
  constructor(
    private readonly entriesLogic: IEntriesLogic,
    private readonly targetResolver: TargetResolver,
  ) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'delete_entry',
      description:
        'Remove one entry, or several when deleteAll is true. Prefer filters over guessing an id. If several meals match and deleteAll is false, the app will ask the user which one. deleteAll requires confirmAll on a later turn.',
      parameters: {
        type: 'object',
        properties: {
          entryId: { type: 'string' },
          from: { type: 'string', description: 'First day, YYYY-MM-DD.' },
          to: { type: 'string', description: 'Last day, YYYY-MM-DD.' },
          mealType: { type: 'string', enum: MEAL_TYPES },
          search: { type: 'string' },
          deleteAll: {
            type: 'boolean',
            description: 'True only when the user asked to delete every matching meal.',
          },
          confirmAll: {
            type: 'boolean',
            description: 'True only after the user confirmed a bulk delete.',
          },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const deleteAll = args.deleteAll === true;
    const confirmAll = args.confirmAll === true;
    const resolved = await this.targetResolver.resolve(args, context, deleteAll ? 'delete_all' : 'remove');

    if (resolved.pending) {
      return { result: resolved.result, pending: resolved.pending };
    }

    if (resolved.entries && deleteAll) {
      if (!confirmAll) {
        const pending = createPending('confirm_bulk_delete', 'bulk delete', resolved.entries);
        return {
          result: { needsConfirmation: true, count: resolved.entries.length, candidates: resolved.entries },
          pending,
        };
      }

      const actions: ChatAction[] = [];
      for (const row of resolved.entries) {
        await this.entriesLogic.deleteEntry(context.userId, row.entryId);
        actions.push({
          tool: 'delete_entry',
          type: 'meal_deleted',
          label: `Deleted ${row.foodName} from ${row.consumedOn}`,
          entryId: row.entryId,
        });
      }

      return {
        result: { deleted: actions.length },
        action: actions[0],
        actions,
      };
    }

    const entryId = resolved.entryId;

    if (!entryId) {
      throw badRequest('entryId is required. Use find_entries to look it up.');
    }

    const entry = await this.entriesLogic.getEntry(context.userId, entryId);
    await this.entriesLogic.deleteEntry(context.userId, entryId);

    return {
      result: { deleted: true, foodName: entry.foodName, consumedOn: entry.consumedOn },
      action: {
        tool: 'delete_entry',
        type: 'meal_deleted',
        label: `Deleted ${entry.foodName} from ${entry.consumedOn}`,
        entryId: entry.id,
      },
    };
  }
}
