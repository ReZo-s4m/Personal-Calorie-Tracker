import type { Paginated } from '../../common/pagination.js';
import type {
  CreateWeightRequest,
  ListWeightsQuery,
  WeightResponse,
  WeightSummary,
} from './models/weights.models.js';

export interface IWeightsLogic {
  /** One reading per calendar day; saving again that day replaces it. */
  logWeight(userId: string, request: CreateWeightRequest): Promise<WeightResponse>;

  getLatestWeight(userId: string): Promise<WeightResponse | null>;

  /** Latest, the one before it, and the last few readings. */
  summariseWeights(userId: string, recentCount?: number): Promise<WeightSummary>;

  listWeights(userId: string, query: ListWeightsQuery): Promise<Paginated<WeightResponse>>;

  deleteWeight(userId: string, id: string): Promise<void>;
}
