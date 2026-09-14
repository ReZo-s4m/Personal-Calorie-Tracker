import { MEAL_TYPES } from '../../../common/nutrition.js';
import { fromDateKey } from '../../../common/dates.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  DEFAULT_ENTRY_RESULTS,
  MAX_ENTRY_RESULTS,
  readDateKey,
  readMealType,
  readNumber,
  readString,
} from './tool-args.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';

export class FindEntriesTool implements IChatTool {
  constructor(private readonly entriesLogic: IEntriesLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'find_entries',
      description:
        'Read entries already in the diary, with totals for the range. Use this before answering anything about what the user ate, and to get an id before changing or deleting an entry.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'First day, YYYY-MM-DD. Defaults to today.' },
          to: { type: 'string', description: 'Last day, YYYY-MM-DD. Defaults to today.' },
          mealType: { type: 'string', enum: MEAL_TYPES },
          search: { type: 'string', description: 'Match on food name.' },
          limit: { type: 'number', description: `1 to ${MAX_ENTRY_RESULTS}. Defaults to ${DEFAULT_ENTRY_RESULTS}.` },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const to = readDateKey(args, 'to') ?? context.today;
    const from = readDateKey(args, 'from') ?? to;
    const limit = Math.min(Math.max(Math.round(readNumber(args, 'limit') ?? DEFAULT_ENTRY_RESULTS), 1), MAX_ENTRY_RESULTS);

    const { data, meta, totals } = await this.entriesLogic.listEntries(context.userId, {
      from: fromDateKey(from),
      to: fromDateKey(to),
      mealType: readMealType(args, 'mealType'),
      search: readString(args, 'search'),
      sort: 'consumedAt',
      order: 'desc',
      page: 1,
      pageSize: limit,
    });

    return {

      result: {
        range: { from, to },
        matched: meta.totalItems,
        showing: data.length,
        totals,
        entries: data.map((entry) => ({
          entryId: entry.id,
          foodName: entry.foodName,
          mealType: entry.mealType,
          quantity: entry.quantity,
          unit: entry.unit,
          calories: entry.calories,
          consumedOn: entry.consumedOn,
        })),
      },
    };
  }
}
