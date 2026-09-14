import { Router } from 'express';
import { rateLimit } from '../middleware/rate-limit.js';
import {
  aiHandler,
  authHandler,
  authenticate,
  entriesHandler,
  targetsHandler,
  reportsHandler,
  weightsHandler,
} from '../container.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use(rateLimit({ name: 'api', max: 90, windowMs: 60_000 }));

apiRouter.use('/auth', authHandler.routes());
apiRouter.use('/entries', authenticate, entriesHandler.routes());
apiRouter.use('/goals', authenticate, targetsHandler.routes());
apiRouter.use('/weights', authenticate, weightsHandler.routes());
apiRouter.use('/reports', authenticate, reportsHandler.routes());

apiRouter.use(
  '/ai',
  authenticate,
  rateLimit({ name: 'ai', max: 20, windowMs: 60_000 }),
  aiHandler.routes(),
);
