import type { Paginated } from '../../common/pagination.js';
import type {
  CreateEntryRequest,
  EntryResponse,
  EntrySource,
  EntryTotals,
  ListEntriesQuery,
  UpdateEntryRequest,
} from './models/entries.models.js';

export type PaginatedEntries = Paginated<EntryResponse> & { totals: EntryTotals };

export interface IEntriesLogic {
  /** A page of the diary plus the totals for the whole filtered range, not just the page. */
  listEntries(userId: string, query: ListEntriesQuery): Promise<PaginatedEntries>;

  getEntry(userId: string, id: string): Promise<EntryResponse>;

  createEntry(
    userId: string,
    request: CreateEntryRequest,
    source?: EntrySource,
  ): Promise<EntryResponse>;

  /** One transaction, so a partly-written import cannot survive a failure. */
  createEntries(
    userId: string,
    requests: CreateEntryRequest[],
    source: EntrySource,
  ): Promise<EntryResponse[]>;

  updateEntry(userId: string, id: string, request: UpdateEntryRequest): Promise<EntryResponse>;

  deleteEntry(userId: string, id: string): Promise<void>;
}
