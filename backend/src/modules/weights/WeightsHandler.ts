import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { pathParam } from '../../common/request.js';
import { requireUser } from '../../middleware/auth.js';
import { handleValidation, validatedBody, validatedQuery } from '../../middleware/validate.js';
import type { IWeightsLogic } from './IWeightsLogic.js';
import type { CreateWeightRequest, ListWeightsQuery } from './models/weights.models.js';
import {
  createWeightRules,
  listWeightsRules,
  weightIdRules,
} from './weights.rules.js';

export class WeightsHandler {
  constructor(private readonly weightsLogic: IWeightsLogic) {}

  routes(): Router {
    const router = Router();

    router.get('/current', asyncHandler(this.current));
    router.get('/', listWeightsRules, handleValidation, asyncHandler(this.list));
    router.post('/', createWeightRules, handleValidation, asyncHandler(this.create));
    router.delete('/:id', weightIdRules, handleValidation, asyncHandler(this.remove));

    return router;
  }

  private current = async (req: Request, res: Response): Promise<void> => {
    res.json({ weight: await this.weightsLogic.getLatestWeight(requireUser(req).userId) });
  };

  private list = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.weightsLogic.listWeights(
        requireUser(req).userId,
        validatedQuery<ListWeightsQuery>(req),
      ),
    );
  };

  private create = async (req: Request, res: Response): Promise<void> => {
    const weight = await this.weightsLogic.logWeight(
      requireUser(req).userId,
      validatedBody<CreateWeightRequest>(req),
    );
    res.status(201).json(weight);
  };

  private remove = async (req: Request, res: Response): Promise<void> => {
    await this.weightsLogic.deleteWeight(requireUser(req).userId, pathParam(req, 'id'));
    res.status(204).send();
  };
}
