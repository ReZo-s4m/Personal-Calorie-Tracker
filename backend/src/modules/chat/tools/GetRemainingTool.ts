import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import { readDateKey } from './tool-args.js';
import type { IRecommendLogic } from '../recommend/IRecommendLogic.js';

export class GetRemainingTool implements IChatTool {
  constructor(private readonly recommendLogic: IRecommendLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'get_remaining',
      description:
        'Calories and macros eaten today (or another day) against the goal, plus what is left. Use before saying whether the user is on track or what they should eat next.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const date = readDateKey(args, 'date') ?? context.today;
    return { result: await this.recommendLogic.getRemainingNutrition(context.userId, date) };
  }
}
