import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { requireUser } from '../../middleware/auth.js';
import { parseChatUpload } from '../../middleware/upload.js';
import { handleValidation, validatedBody } from '../../middleware/validate.js';
import type { IChatLogic } from './IChatLogic.js';
import type { ChatRequest } from './models/chat.models.js';
import { chatRules } from './chat.rules.js';

export class ChatHandler {
  constructor(private readonly chatLogic: IChatLogic) {}

  /** Mounted on /ai alongside the AI router, so the public path is /ai/chat. */
  routes(): Router {
    const router = Router();

    router.post('/chat', parseChatUpload, chatRules, handleValidation, asyncHandler(this.chat));

    return router;
  }

  private chat = async (req: Request, res: Response): Promise<void> => {
    const attachment = req.file
      ? { buffer: req.file.buffer, mimeType: req.file.mimetype }
      : undefined;

    res.json(
      await this.chatLogic.respond(
        requireUser(req).userId,
        validatedBody<ChatRequest>(req),
        attachment,
      ),
    );
  };
}
