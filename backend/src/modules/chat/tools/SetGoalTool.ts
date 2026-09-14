import { fromDateKey } from '../../../common/dates.js';
import { badRequest } from '../../../common/errors.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  LIMITS,
  amountOrUndefined,
  clamp,
  macroTarget,
  optional,
  readDateKey,
  readNumber,
} from './tool-args.js';
import type { ITargetsLogic } from '../../targets/ITargetsLogic.js';

export class SetGoalTool implements IChatTool {
  constructor(private readonly targetsLogic: ITargetsLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'set_goal',
      description:
        'Set or change the daily targets. Send only the fields that change. Missing macros are carried over from the current goal, or derived from the calorie target.',
      parameters: {
        type: 'object',
        properties: {
          dailyCalories: { type: 'number' },
          proteinGrams: { type: 'number' },
          carbGrams: { type: 'number' },
          fatGrams: { type: 'number' },
          targetWeightKg: { type: 'number' },
          effectiveFrom: {
            type: 'string',
            description: 'YYYY-MM-DD, the day the targets start applying. Defaults to today.',
          },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const dailyCalories = readNumber(args, 'dailyCalories');
    const current = await this.targetsLogic.getTargetForDate(context.userId, fromDateKey(context.today));
    const effectiveFrom = readDateKey(args, 'effectiveFrom') ?? context.today;

    if (
      dailyCalories === undefined &&
      readNumber(args, 'proteinGrams') === undefined &&
      readNumber(args, 'carbGrams') === undefined &&
      readNumber(args, 'fatGrams') === undefined &&
      readNumber(args, 'targetWeightKg') === undefined
    ) {
      throw badRequest('Provide at least one target to change.');
    }

    if ((dailyCalories === undefined || dailyCalories <= 0) && !current) {
      throw badRequest('dailyCalories is required when no goal exists yet.');
    }

    const calories = clamp(dailyCalories ?? current?.dailyCalories ?? 0, 0, LIMITS.dailyCalories);

    const goal = await this.targetsLogic.setTarget(context.userId, {
      dailyCalories: calories,
      proteinGrams: macroTarget(args, 'proteinGrams', current?.proteinGrams, calories, 'protein'),
      carbGrams: macroTarget(args, 'carbGrams', current?.carbGrams, calories, 'carbs'),
      fatGrams: macroTarget(args, 'fatGrams', current?.fatGrams, calories, 'fat'),
      ...optional(
        'targetWeightKg',
        amountOrUndefined(readNumber(args, 'targetWeightKg'), LIMITS.targetWeightKg),
      ),
      effectiveFrom: fromDateKey(effectiveFrom),
    });

    return {
      result: { goal },
      action: {
        tool: 'set_goal',
        type: 'goals_updated',
        label: `Goal set from ${goal.effectiveFrom} — ${Math.round(goal.dailyCalories)} kcal, ${Math.round(goal.proteinGrams)}g protein, ${Math.round(goal.carbGrams)}g carbs, ${Math.round(goal.fatGrams)}g fat`,
      },
    };
  }
}
