import { MEAL_TYPES } from '../../../common/nutrition.js';
import { badRequest } from '../../../common/errors.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  LIMITS,
  amountOrUndefined,
  optional,
  readDateKey,
  readMealType,
  readNumber,
  readString,
  timestampFor,
} from './tool-args.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';
import type { UpdateEntryRequest } from '../../entries/models/entries.models.js';
import { TargetResolver } from './TargetResolver.js';

export class UpdateEntryTool implements IChatTool {
  constructor(
    private readonly entriesLogic: IEntriesLogic,
    private readonly targetResolver: TargetResolver,
  ) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'update_entry',
      description:
        'Correct an entry that already exists. Prefer entryId from find_entries. If the user pointed at a meal by day or name instead, pass those filters and omit entryId — do not guess an id.',
      parameters: {
        type: 'object',
        properties: {
          entryId: { type: 'string' },
          from: { type: 'string', description: 'First day to search, YYYY-MM-DD.' },
          to: { type: 'string', description: 'Last day to search, YYYY-MM-DD.' },
          search: { type: 'string', description: 'Food name to match when entryId is unknown.' },
          foodName: { type: 'string' },
          mealType: { type: 'string', enum: MEAL_TYPES },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          calories: { type: 'number' },
          proteinGrams: { type: 'number' },
          carbGrams: { type: 'number' },
          fatGrams: { type: 'number' },
          consumedOn: { type: 'string', description: 'Move the entry to this day, YYYY-MM-DD.' },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const resolved = await this.targetResolver.resolve(args, context, 'change');

    if (resolved.pending) {
      return { result: resolved.result, pending: resolved.pending };
    }

    const entryId = resolved.entryId;
    const consumedOn = readDateKey(args, 'consumedOn');

    const changes: UpdateEntryRequest = {
      ...optional('foodName', readString(args, 'foodName')?.slice(0, 160)),
      ...optional('mealType', readMealType(args, 'mealType')),
      ...optional('quantity', amountOrUndefined(readNumber(args, 'quantity'), LIMITS.quantity)),
      ...optional('unit', readString(args, 'unit')?.slice(0, 24)),
      ...optional('calories', amountOrUndefined(readNumber(args, 'calories'))),
      ...optional('proteinGrams', amountOrUndefined(readNumber(args, 'proteinGrams'))),
      ...optional('carbGrams', amountOrUndefined(readNumber(args, 'carbGrams'))),
      ...optional('fatGrams', amountOrUndefined(readNumber(args, 'fatGrams'))),
      ...optional('consumedOn', consumedOn),

      ...optional('consumedAt', consumedOn ? timestampFor(consumedOn, context.today) : undefined),
    };

    if (Object.keys(changes).length === 0) {
      throw badRequest('Provide at least one field to change.');
    }

    if (!entryId) {
      throw badRequest('entryId is required. Use find_entries to look it up.');
    }

    const entry = await this.entriesLogic.updateEntry(context.userId, entryId, changes);

    return {
      result: {
        entryId: entry.id,
        foodName: entry.foodName,
        mealType: entry.mealType,
        calories: entry.calories,
        consumedOn: entry.consumedOn,
      },
      action: {
        tool: 'update_entry',
        type: 'meal_updated',
        label: `Updated ${entry.foodName} — ${Math.round(entry.calories)} kcal, ${entry.mealType} on ${entry.consumedOn}`,
        entryId: entry.id,
      },
    };
  }
}
