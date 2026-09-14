import type { PaginationQuery } from '../../../common/pagination.js';

/** Wire in. */
export interface CreateWeightRequest {
  kg: number;
  loggedOn?: string;
  note?: string;
}

export type ListWeightsQuery = PaginationQuery;

/** Wire out. */
export interface WeightResponse {
  id: string;
  kg: number;
  loggedOn: string;
  note: string | null;
  createdAt: string;
}

/** Internal: what the chat tools read about the scale. */
export interface WeightSummary {
  latest: WeightResponse | null;
  previous: WeightResponse | null;
  recent: WeightResponse[];
}
