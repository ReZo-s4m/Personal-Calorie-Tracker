import type { Paginated } from '../../common/pagination.js';
import type { CreateTargetRequest, TargetResponse, ListTargetsQuery } from './models/targets.models.js';

export interface ITargetsLogic {
  /** Saving again for the same effectiveFrom replaces that version rather than stacking one. */
  setTarget(userId: string, request: CreateTargetRequest): Promise<TargetResponse>;

  /** The goal in force on a day, or null if none had started yet. */
  getTargetForDate(userId: string, date: Date): Promise<TargetResponse | null>;

  /** Every version needed to answer "what was the target on each day of this range". */
  getTargetsCovering(userId: string, from: Date, to: Date): Promise<TargetResponse[]>;

  listTargets(userId: string, query: ListTargetsQuery): Promise<Paginated<TargetResponse>>;

  deleteTarget(userId: string, id: string): Promise<void>;
}
