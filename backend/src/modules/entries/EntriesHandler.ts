import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { pathParam } from '../../common/request.js';
import { requireUser } from '../../middleware/auth.js';
import { handleValidation, validatedBody, validatedQuery } from '../../middleware/validate.js';
import type { IEntriesLogic } from './IEntriesLogic.js';
import type {
  CreateEntriesBatchRequest,
  CreateEntryRequest,
  ListEntriesQuery,
  UpdateEntryRequest,
} from './models/entries.models.js';
import {
  createEntriesBatchRules,
  createEntryRules,
  entryIdRules,
  listEntriesRules,
  updateEntryRules,
} from './entries.rules.js';

export class EntriesHandler {
  constructor(private readonly entriesLogic: IEntriesLogic) {}

  routes(): Router {
    const router = Router();

    router.get('/', listEntriesRules, handleValidation, asyncHandler(this.list));
    router.post('/', createEntryRules, handleValidation, asyncHandler(this.create));
    router.post('/batch', createEntriesBatchRules, handleValidation, asyncHandler(this.createBatch));
    router.get('/:id', entryIdRules, handleValidation, asyncHandler(this.get));
    router.patch('/:id', entryIdRules, updateEntryRules, handleValidation, asyncHandler(this.update));
    router.delete('/:id', entryIdRules, handleValidation, asyncHandler(this.remove));

    return router;
  }

  private list = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.entriesLogic.listEntries(
        requireUser(req).userId,
        validatedQuery<ListEntriesQuery>(req),
      ),
    );
  };

  private create = async (req: Request, res: Response): Promise<void> => {
    const body = validatedBody<CreateEntryRequest & { source?: 'manual' | 'image' }>(req);
    const entry = await this.entriesLogic.createEntry(
      requireUser(req).userId,
      body,
      body.source ?? 'manual',
    );
    res.status(201).json(entry);
  };

  private createBatch = async (req: Request, res: Response): Promise<void> => {
    const body = validatedBody<CreateEntriesBatchRequest>(req);
    const entries = await this.entriesLogic.createEntries(
      requireUser(req).userId,
      body.entries,
      body.source ?? 'manual',
    );
    res.status(201).json({ data: entries });
  };

  private get = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.entriesLogic.getEntry(requireUser(req).userId, pathParam(req, 'id')));
  };

  private update = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.entriesLogic.updateEntry(
      requireUser(req).userId,
      pathParam(req, 'id'),
      validatedBody<UpdateEntryRequest>(req),
    );
    res.json(entry);
  };

  private remove = async (req: Request, res: Response): Promise<void> => {
    await this.entriesLogic.deleteEntry(requireUser(req).userId, pathParam(req, 'id'));
    res.status(204).send();
  };
}
