import { fromDateKey } from '../../../common/dates.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import { readDateKey } from './tool-args.js';
import type { ITargetsLogic } from '../../targets/ITargetsLogic.js';

export class GetGoalTool implements IChatTool {
  constructor(private readonly targetsLogic: ITargetsLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'get_goal',
      description: 'The targets in force on a day. Use before answering anything about goals.',
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
    const goal = await this.targetsLogic.getTargetForDate(context.userId, fromDateKey(date));

    return { result: goal ? { date, goal } : { date, goal: null, message: 'No goal has been set.' } };
  }
}
