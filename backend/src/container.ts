import { config } from './config/index.js';
import { SystemClock, type IClock } from './common/clock.js';
import { prisma } from './common/prisma.js';
import type { ITokenLogic } from './common/security/ITokenLogic.js';
import { JwtTokenLogic } from './common/security/JwtTokenLogic.js';
import { createAuthenticate } from './middleware/auth.js';
import { geminiChatProvider, geminiDocumentProvider, visionChatProvider } from './providers/ai/index.js';
import { DiaryParsers } from './providers/diary/DiaryParsers.js';
import { GeminiDiaryParser } from './providers/diary/GeminiDiaryParser.js';
import { ScriptDiaryParser } from './providers/diary/ScriptDiaryParser.js';
import { AiHandler } from './modules/ai/AiHandler.js';
import { ExtractLogic } from './modules/ai/ExtractLogic.js';
import type { IExtractLogic } from './modules/ai/IExtractLogic.js';
import { AuthHandler } from './modules/auth/AuthHandler.js';
import { AuthLogic } from './modules/auth/AuthLogic.js';
import type { IAuthLogic } from './modules/auth/IAuthLogic.js';
import { ChatHandler } from './modules/chat/ChatHandler.js';
import { ChatLogic } from './modules/chat/ChatLogic.js';
import type { IChatLogic } from './modules/chat/IChatLogic.js';
import { AttachmentsLogic } from './modules/chat/attachments/AttachmentsLogic.js';
import { PendingLogic } from './modules/chat/pending/PendingLogic.js';
import { RecommendLogic } from './modules/chat/recommend/RecommendLogic.js';
import type { IRecommendLogic } from './modules/chat/recommend/IRecommendLogic.js';
import { ChatTools } from './modules/chat/tools/ChatTools.js';
import { TargetResolver } from './modules/chat/tools/TargetResolver.js';
import { DeleteEntryTool } from './modules/chat/tools/DeleteEntryTool.js';
import { FindEntriesTool } from './modules/chat/tools/FindEntriesTool.js';
import { GenerateReportPdfTool } from './modules/chat/tools/GenerateReportPdfTool.js';
import { GetGoalTool } from './modules/chat/tools/GetGoalTool.js';
import { GetRemainingTool } from './modules/chat/tools/GetRemainingTool.js';
import { GetSummaryTool } from './modules/chat/tools/GetSummaryTool.js';
import { GetWeightTool } from './modules/chat/tools/GetWeightTool.js';
import { LogMealTool } from './modules/chat/tools/LogMealTool.js';
import { RecommendMealTool } from './modules/chat/tools/RecommendMealTool.js';
import { SetGoalTool } from './modules/chat/tools/SetGoalTool.js';
import { UpdateEntryTool } from './modules/chat/tools/UpdateEntryTool.js';
import { EntriesHandler } from './modules/entries/EntriesHandler.js';
import { EntriesLogic } from './modules/entries/EntriesLogic.js';
import type { IEntriesLogic } from './modules/entries/IEntriesLogic.js';
import { ImportsHandler } from './modules/imports/ImportsHandler.js';
import { ImportsLogic } from './modules/imports/ImportsLogic.js';
import type { IImportsLogic } from './modules/imports/IImportsLogic.js';
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

export const diaryParsers = new DiaryParsers([
  new ScriptDiaryParser(),
  new GeminiDiaryParser(geminiDocumentProvider),
]);

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
export const importsLogic: IImportsLogic = new ImportsLogic(entriesLogic, diaryParsers);
export const extractLogic: IExtractLogic = new ExtractLogic(visionChatProvider, config.ai);
export const recommendLogic: IRecommendLogic = new RecommendLogic(
  entriesLogic,
  targetsLogic,
);
export const pendingLogic = new PendingLogic(entriesLogic);
const targetResolver = new TargetResolver(pendingLogic);

export const chatTools = new ChatTools([
  new LogMealTool(entriesLogic),
  new FindEntriesTool(entriesLogic),
  new UpdateEntryTool(entriesLogic, targetResolver),
  new DeleteEntryTool(entriesLogic, targetResolver),
  new GetGoalTool(targetsLogic),
  new SetGoalTool(targetsLogic),
  new GetSummaryTool(reportsLogic),
  new GetRemainingTool(recommendLogic),
  new GetWeightTool(weightsLogic, targetsLogic),
  new GenerateReportPdfTool(reportPdfLogic),
  new RecommendMealTool(recommendLogic),
]);

export const attachmentsLogic = new AttachmentsLogic(
  extractLogic,
  importsLogic,
  entriesLogic,
  geminiChatProvider,
);

export const chatLogic: IChatLogic = new ChatLogic(
  geminiChatProvider,
  chatTools,
  pendingLogic,
  attachmentsLogic,
  authLogic,
);

export const aiHandler = new AiHandler(extractLogic, geminiChatProvider);
export const authHandler = new AuthHandler(authLogic, authenticate);
export const chatHandler = new ChatHandler(chatLogic);
export const entriesHandler = new EntriesHandler(entriesLogic);
export const targetsHandler = new TargetsHandler(targetsLogic, clock);
export const importsHandler = new ImportsHandler(importsLogic);
export const weightsHandler = new WeightsHandler(weightsLogic);
export const reportsHandler = new ReportsHandler(reportsLogic, reportPdfLogic);
