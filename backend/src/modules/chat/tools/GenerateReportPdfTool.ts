import { fromDateKey } from '../../../common/dates.js';
import type { ToolDefinition } from '../../../providers/ai/index.js';
import type { IChatTool, ToolContext, ToolOutcome } from './IChatTool.js';
import {
  readDateKey,
  readString,
} from './tool-args.js';
import type { IReportPdfLogic } from '../../reports/IReportPdfLogic.js';
import { resolveReportWindow } from '../pending/chat-dates.js';

export class GenerateReportPdfTool implements IChatTool {
  constructor(private readonly reportPdfLogic: IReportPdfLogic) {}

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'generate_report_pdf',
      description:
        'Build the downloadable nutrition PDF for a date range. Use this when they ask for a report, a PDF, last week, this month, or any custom window. If they name no dates, omit from/to and period so the previous ISO week is used.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'First day YYYY-MM-DD. Wins over period when both are set.',
          },
          to: {
            type: 'string',
            description: 'Last day YYYY-MM-DD. Wins over period when both are set.',
          },
          period: {
            type: 'string',
            enum: ['last_week', 'this_week', 'last_7_days', 'this_month', 'last_month'],
            description:
              'Used when from/to are omitted. last_week is the previous Monday–Sunday. last_7_days is today and the six days before.',
          },
        },
      },
    },
  };

  async handle(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const window = resolveReportWindow({
      today: context.today,
      from: readDateKey(args, 'from'),
      to: readDateKey(args, 'to'),
      period: readString(args, 'period'),
    });

    const { buffer, filename } = await this.reportPdfLogic.buildReportPdf(context.userId, {
      from: fromDateKey(window.from),
      to: fromDateKey(window.to),
      page: 1,
      pageSize: 100,
    });

    return {
      result: {
        ready: true,
        from: window.from,
        to: window.to,
        filename,
        bytes: buffer.length,
      },
      action: {
        tool: 'generate_report_pdf',
        type: 'report_ready',
        label: `PDF ready — ${window.from} to ${window.to}`,
        from: window.from,
        to: window.to,
        filename,
      },
      download: { filename, buffer },
    };
  }
}
