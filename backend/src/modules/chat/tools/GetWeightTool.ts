import { fromDateKey } from '../../../common/dates.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import type { IWeightsLogic } from '../../weights/IWeightsLogic.js';
import type { ITargetsLogic } from '../../targets/ITargetsLogic.js';

export class GetWeightTool implements IChatTool {
  constructor(
    private readonly weightsLogic: IWeightsLogic,
    private readonly targetsLogic: ITargetsLogic,
  ) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'get_weight',
      description:
        'Latest weigh-in, the one before it, and the last few readings. Use before talking about weight, a cut, or a gym plan.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  };

  async handle(_args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const [summary, goal] = await Promise.all([
      this.weightsLogic.summariseWeights(context.userId, 8),
      this.targetsLogic.getTargetForDate(context.userId, fromDateKey(context.today)),
    ]);

    return {
      result: {
        latest: summary.latest,
        previous: summary.previous,
        recent: summary.recent,
        targetWeightKg: goal?.targetWeightKg ?? null,
      },
    };
  }
}
