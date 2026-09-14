import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { badRequest } from '../../common/errors.js';
import { IMAGE_SIZE_LIMIT_MB, uploadImage } from '../../middleware/upload.js';
import type { IChatProvider } from '../../providers/ai/IChatProvider.js';
import type { IExtractLogic } from './IExtractLogic.js';

/**
 * Capability probe and photo extract. Ask AI mounts its own router on the same
 * /ai prefix, so this controller only reports whether the chat provider is set.
 */
export class AiHandler {
  constructor(
    private readonly extractLogic: IExtractLogic,
    private readonly chatProvider: IChatProvider,
  ) {}

  routes(): Router {
    const router = Router();

    router.get('/status', this.status);
    router.post('/extract', uploadImage, asyncHandler(this.extract));

    return router;
  }

  private status = (_req: Request, res: Response): void => {
    const extractAvailable = this.extractLogic.isConfigured();
    const chatAvailable = this.chatProvider.isConfigured();

    res.json({
      available: extractAvailable,
      extractAvailable,
      chatAvailable,
    });
  };

  private extract = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw badRequest(
        `Attach an image in the "image" field (JPEG, PNG or WebP, up to ${IMAGE_SIZE_LIMIT_MB} MB).`,
      );
    }

    res.json(
      await this.extractLogic.extractNutritionFromImage(req.file.buffer, req.file.mimetype),
    );
  };
}
