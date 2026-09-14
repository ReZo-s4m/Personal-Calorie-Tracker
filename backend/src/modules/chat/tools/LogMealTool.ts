import {
  MEAL_TYPES,
  MICRONUTRIENT_KEYS,
} from '../../../common/nutrition.js';
import { badRequest } from '../../../common/errors.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  LIMITS,
  clamp,
  clampAmount,
  readDateKey,
  readMealType,
  readMicronutrients,
  readNumber,
  readString,
  timestampFor,
} from './tool-args.js';
import type { IEntriesLogic } from '../../entries/IEntriesLogic.js';
import type { CreateEntryRequest } from '../../entries/models/entries.models.js';

export class LogMealTool implements IChatTool {
  constructor(private readonly entriesLogic: IEntriesLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'log_meal',
      description:
        'Add one food to the diary. Estimate the nutrition yourself when the user does not give numbers. Call once per distinct food.',
      parameters: {
        type: 'object',
        required: ['foodName', 'mealType', 'calories'],
        properties: {
          foodName: { type: 'string', description: 'What was eaten, e.g. "Grilled chicken salad".' },
          mealType: { type: 'string', enum: MEAL_TYPES },
          calories: { type: 'number', description: 'Total kcal for the portion described.' },
          quantity: { type: 'number', description: 'Portion amount. Defaults to 1.' },
          unit: { type: 'string', description: 'g, ml, cup, bowl, piece, serving.' },
          proteinGrams: { type: 'number' },
          carbGrams: { type: 'number' },
          fatGrams: { type: 'number' },
          consumedOn: {
            type: 'string',
            description: 'Calendar day as YYYY-MM-DD. Defaults to today.',
          },
          micronutrients: {
            type: 'array',
            description: 'Only when notable or stated. At most 8.',
            items: {
              type: 'object',
              required: ['nutrient', 'amount'],
              properties: {
                nutrient: { type: 'string', enum: MICRONUTRIENT_KEYS },
                amount: { type: 'number' },
              },
            },
          },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const foodName = readString(args, 'foodName');
    const mealType = readMealType(args, 'mealType');
    const calories = readNumber(args, 'calories');

    if (!foodName) {
      throw badRequest('foodName is required.');
    }

    if (!mealType) {
      throw badRequest(`mealType must be one of: ${MEAL_TYPES.join(', ')}.`);
    }

    if (calories === undefined) {
      throw badRequest('calories is required. Estimate it from the food and portion.');
    }

    const consumedOn = readDateKey(args, 'consumedOn') ?? context.today;

    const input: CreateEntryRequest = {
      foodName: foodName.slice(0, 160),
      mealType,

      quantity: clamp(readNumber(args, 'quantity'), 1, LIMITS.quantity) || 1,
      unit: (readString(args, 'unit') ?? 'serving').slice(0, 24),
      calories: clampAmount(calories, 0),
      proteinGrams: clampAmount(readNumber(args, 'proteinGrams'), 0),
      carbGrams: clampAmount(readNumber(args, 'carbGrams'), 0),
      fatGrams: clampAmount(readNumber(args, 'fatGrams'), 0),
      consumedAt: timestampFor(consumedOn, context.today),
      consumedOn,
      micronutrients: readMicronutrients(args),
    };

    const entry = await this.entriesLogic.createEntry(context.userId, input, 'chat');

    return {
      result: {
        entryId: entry.id,
        foodName: entry.foodName,
        mealType: entry.mealType,
        calories: entry.calories,
        consumedOn: entry.consumedOn,
      },
      action: {
        tool: 'log_meal',
        type: 'meal_created',
        label: `Logged ${entry.foodName} — ${Math.round(entry.calories)} kcal, ${entry.mealType} on ${entry.consumedOn}`,
        entryId: entry.id,
      },
    };
  }
}
