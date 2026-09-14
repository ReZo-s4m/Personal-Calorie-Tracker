import { Router } from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import { authHandler, authenticate, entriesHandler, targetsHandler } from '../container.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use(rateLimit({ name: 'api', max: 90, windowMs: 60_000 }));

apiRouter.use('/auth', authHandler.routes());
apiRouter.use('/entries', authenticate, entriesHandler.routes());
apiRouter.use('/goals', authenticate, targetsHandler.routes());
