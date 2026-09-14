import { AppError } from '../../../common/errors.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import { parseArguments } from './tool-args.js';

/**
 * The tool registry. Holds every IChatTool by the name its definition
 * advertises, hands out definitions (all of them, or a named subset) and
 * dispatches a call by name.
 */
export class ChatTools {
  private readonly byName: Map<string, IChatTool>;

  constructor(tools: IChatTool[]) {
    this.byName = new Map(tools.map((tool) => [tool.definition.function.name, tool]));
  }

  /** Every definition, or just the named ones, in registration order. */
  definitions(names?: readonly string[]): ToolDefinition[] {
    const all = [...this.byName.values()].map((tool) => tool.definition);

    return names ? all.filter((definition) => names.includes(definition.function.name)) : all;
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  /**
   * Never throws: a tool failure is reported back to the model as a result it
   * can talk about, not as a broken turn.
   */
  async run(name: string, rawArguments: string, context: ToolContext): Promise<ToolOutcome> {
    const tool = this.byName.get(name);

    if (!tool) {
      return { result: { error: `Unknown tool "${name}".` } };
    }

    try {
      return await tool.handle(parseArguments(rawArguments), context);
    } catch (error) {
      if (error instanceof AppError) {
        return { result: { error: error.message } };
      }

      console.error(`Chat tool ${name} failed:`, error);
      return { result: { error: 'That action could not be completed.' } };
    }
  }
}
