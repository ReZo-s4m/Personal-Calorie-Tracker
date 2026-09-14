import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { requireUser } from '../../middleware/auth.js';
import { handleValidation, validatedQuery } from '../../middleware/validate.js';
import type { IReportPdfLogic } from './IReportPdfLogic.js';
import type { IReportsLogic } from './IReportsLogic.js';
import type { ReportRangeQuery } from './models/reports.models.js';
import { reportRangeRules } from './reports.rules.js';

export class ReportsHandler {
  constructor(
    private readonly reportsLogic: IReportsLogic,
    private readonly reportPdfLogic: IReportPdfLogic,
  ) {}

  routes(): Router {
    const router = Router();

    router.get('/daily', reportRangeRules, handleValidation, asyncHandler(this.daily));
    router.get('/weekly', reportRangeRules, handleValidation, asyncHandler(this.weekly));
    router.get('/macros', reportRangeRules, handleValidation, asyncHandler(this.macros));
    router.get('/micronutrients', reportRangeRules, handleValidation, asyncHandler(this.micronutrients));
    router.get('/pdf', reportRangeRules, handleValidation, asyncHandler(this.pdf));
    router.get('/goal-comparison', reportRangeRules, handleValidation, asyncHandler(this.goalComparison));

    return router;
  }

  private query(req: Request): ReportRangeQuery {
    return validatedQuery<ReportRangeQuery>(req);
  }

  private daily = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reportsLogic.getDailyReport(requireUser(req).userId, this.query(req)));
  };

  private weekly = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reportsLogic.getWeeklyReport(requireUser(req).userId, this.query(req)));
  };

  private macros = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reportsLogic.getMacroBreakdown(requireUser(req).userId, this.query(req)));
  };

  private micronutrients = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.reportsLogic.getMicronutrientReport(requireUser(req).userId, this.query(req)),
    );
  };

  private goalComparison = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reportsLogic.getTargetComparison(requireUser(req).userId, this.query(req)));
  };

  private pdf = async (req: Request, res: Response): Promise<void> => {
    const { buffer, filename } = await this.reportPdfLogic.buildReportPdf(
      requireUser(req).userId,
      this.query(req),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  };
}
