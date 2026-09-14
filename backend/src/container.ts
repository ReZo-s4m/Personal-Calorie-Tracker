import { config } from './config/index.js';
import { SystemClock, type IClock } from './common/clock.js';
import { prisma } from './common/prisma.js';
import type { ITokenLogic } from './common/security/ITokenLogic.js';
import { JwtTokenLogic } from './common/security/JwtTokenLogic.js';
import { createAuthenticate } from './middleware/auth.js';
import { geminiChatProvider, visionChatProvider } from './providers/ai/index.js';
import { AiHandler } from './modules/ai/AiHandler.js';
import { ExtractLogic } from './modules/ai/ExtractLogic.js';
import type { IExtractLogic } from './modules/ai/IExtractLogic.js';
import { AuthHandler } from './modules/auth/AuthHandler.js';
import { AuthLogic } from './modules/auth/AuthLogic.js';
import type { IAuthLogic } from './modules/auth/IAuthLogic.js';
import { EntriesHandler } from './modules/entries/EntriesHandler.js';
import { EntriesLogic } from './modules/entries/EntriesLogic.js';
import type { IEntriesLogic } from './modules/entries/IEntriesLogic.js';
import { TargetsHandler } from './modules/targets/TargetsHandler.js';
import { TargetsLogic } from './modules/targets/TargetsLogic.js';
import type { ITargetsLogic } from './modules/targets/ITargetsLogic.js';
import { ReportPdfLogic } from './modules/reports/ReportPdfLogic.js';
import { ReportsHandler } from './modules/reports/ReportsHandler.js';
import { ReportsLogic } from './modules/reports/ReportsLogic.js';
import type { IReportPdfLogic } from './modules/reports/IReportPdfLogic.js';
import type { IReportsLogic } from './modules/reports/IReportsLogic.js';
import { WeightsHandler } from './modules/weights/WeightsHandler.js';
import { WeightsLogic } from './modules/weights/WeightsLogic.js';
import type { IWeightsLogic } from './modules/weights/IWeightsLogic.js';

export const clock: IClock = new SystemClock();
export const tokenLogic: ITokenLogic = new JwtTokenLogic(config.jwt);
export const authenticate = createAuthenticate(tokenLogic);

export const authLogic: IAuthLogic = new AuthLogic(prisma, tokenLogic);
export const entriesLogic: IEntriesLogic = new EntriesLogic(prisma, clock);
export const targetsLogic: ITargetsLogic = new TargetsLogic(prisma, clock);
export const weightsLogic: IWeightsLogic = new WeightsLogic(prisma, clock);
export const reportsLogic: IReportsLogic = new ReportsLogic(prisma, targetsLogic, clock);
export const reportPdfLogic: IReportPdfLogic = new ReportPdfLogic(
  reportsLogic,
  authLogic,
  clock,
);
export const extractLogic: IExtractLogic = new ExtractLogic(visionChatProvider, config.ai);

export const aiHandler = new AiHandler(extractLogic, geminiChatProvider);
export const authHandler = new AuthHandler(authLogic, authenticate);
export const entriesHandler = new EntriesHandler(entriesLogic);
export const targetsHandler = new TargetsHandler(targetsLogic, clock);
export const weightsHandler = new WeightsHandler(weightsLogic);
export const reportsHandler = new ReportsHandler(reportsLogic, reportPdfLogic);
