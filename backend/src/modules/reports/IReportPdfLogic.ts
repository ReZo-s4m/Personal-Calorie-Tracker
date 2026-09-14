import type { ReportPdf, ReportRangeQuery } from './models/reports.models.js';

export interface IReportPdfLogic {
  /** The same figures the Reports page shows, rendered as a downloadable document. */
  buildReportPdf(userId: string, query: ReportRangeQuery): Promise<ReportPdf>;
}
