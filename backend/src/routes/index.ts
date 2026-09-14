import { Router } from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import { authHandler } from '../container.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use(rateLimit({ name: 'api', max: 90, windowMs: 60_000 }));

apiRouter.use('/auth', authHandler.routes());
