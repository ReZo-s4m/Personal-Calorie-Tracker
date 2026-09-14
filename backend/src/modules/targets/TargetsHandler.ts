import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { fromDateKey } from '../../common/dates.js';
import type { IClock } from '../../common/clock.js';
import { pathParam } from '../../common/request.js';
import { requireUser } from '../../middleware/auth.js';
import { handleValidation, validatedBody, validatedQuery } from '../../middleware/validate.js';
import type { ITargetsLogic } from './ITargetsLogic.js';
import type { CreateTargetRequest, ListTargetsQuery } from './models/targets.models.js';
import {
  createTargetRules,
  currentTargetRules,
  targetIdRules,
  listTargetsRules,
} from './targets.rules.js';

export class TargetsHandler {
  constructor(
    private readonly targetsLogic: ITargetsLogic,
    private readonly clock: IClock,
  ) {}

  routes(): Router {
    const router = Router();

    router.get('/current', currentTargetRules, handleValidation, asyncHandler(this.current));
    router.get('/', listTargetsRules, handleValidation, asyncHandler(this.list));
    router.post('/', createTargetRules, handleValidation, asyncHandler(this.create));
    router.delete('/:id', targetIdRules, handleValidation, asyncHandler(this.remove));

    return router;
  }

  private current = async (req: Request, res: Response): Promise<void> => {
    const { date } = validatedQuery<{ date?: string }>(req);

    const goal = await this.targetsLogic.getTargetForDate(
      requireUser(req).userId,
      date ? fromDateKey(date) : this.clock.now(),
    );

    res.json({ goal });
  };

  private list = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.targetsLogic.listTargets(
        requireUser(req).userId,
        validatedQuery<ListTargetsQuery>(req),
      ),
    );
  };

  private create = async (req: Request, res: Response): Promise<void> => {
    const goal = await this.targetsLogic.setTarget(
      requireUser(req).userId,
      validatedBody<CreateTargetRequest>(req),
    );
    res.status(201).json(goal);
  };

  private remove = async (req: Request, res: Response): Promise<void> => {
    await this.targetsLogic.deleteTarget(requireUser(req).userId, pathParam(req, 'id'));
    res.status(204).send();
  };
}
