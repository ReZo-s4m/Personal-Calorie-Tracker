import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import { readDateKey } from './tool-args.js';
import type { IRecommendLogic } from '../recommend/IRecommendLogic.js';

export class RecommendMealTool implements IChatTool {
  constructor(private readonly recommendLogic: IRecommendLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'recommend_meal',
      description:
        'Suggest foods that fit the remaining calorie and protein budget. Always call get_remaining first, or this tool will compute remaining itself.',
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
    return { result: await this.recommendLogic.recommendFoods(context.userId, date) };
  }
}
