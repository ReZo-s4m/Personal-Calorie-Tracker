import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { badRequest } from '../../common/errors.js';
import { requireUser } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { PDF_SIZE_LIMIT_MB, uploadPdf } from '../../middleware/upload.js';
import { handleValidation, validatedBody } from '../../middleware/validate.js';
import type { IImportsLogic } from './IImportsLogic.js';
import type { ImportDraftRow, ImportMethod } from './models/imports.models.js';
import { importCommitRules, importParseRules } from './imports.rules.js';

export class ImportsHandler {
  constructor(private readonly importsLogic: IImportsLogic) {}

  routes(): Router {
    const router = Router();

    router.get('/status', this.status);
    router.post(
      '/parse',
      rateLimit({ name: 'import', max: 8, windowMs: 60_000 }),
      uploadPdf,
      importParseRules,
      handleValidation,
      asyncHandler(this.parse),
    );
    router.post('/commit', importCommitRules, handleValidation, asyncHandler(this.commit));

    return router;
  }

  private status = (_req: Request, res: Response): void => {
    res.json(this.importsLogic.importStatus());
  };

  private parse = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw badRequest(`Attach a PDF in the "file" field (up to ${PDF_SIZE_LIMIT_MB} MB).`);
    }

    const { today, mode } = validatedBody<{ today: string; mode?: ImportMethod }>(req);

    res.json(
      await this.importsLogic.previewImport(
        req.file.buffer,
        today,
        mode === 'gemini' ? 'gemini' : 'script',
      ),
    );
  };

  private commit = async (req: Request, res: Response): Promise<void> => {
    const { today, rows } = validatedBody<{ today: string; rows: ImportDraftRow[] }>(req);
    const result = await this.importsLogic.commitImport(requireUser(req).userId, rows, today);

    res.status(201).json(result);
  };
}
