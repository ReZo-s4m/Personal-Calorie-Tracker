import type { Prisma, PrismaClient } from '@prisma/client';
import type { IClock } from '../../common/clock.js';
import { fromDateKey, startOfUtcDay } from '../../common/dates.js';
import { badRequest, notFound } from '../../common/errors.js';
import { labelForNutrient, unitForNutrient } from '../../common/nutrition.js';
import { paginate, toSkipTake } from '../../common/pagination.js';
import type { IEntriesLogic, PaginatedEntries } from './IEntriesLogic.js';
import type {
  CreateEntryRequest,
  EntryResponse,
  EntrySource,
  ListEntriesQuery,
  MealType,
  MicronutrientInput,
  UpdateEntryRequest,
} from './models/entries.models.js';

const WITH_NUTRIENTS = { micronutrients: { orderBy: { nutrient: 'asc' } } } as const;

type EntryRecord = Prisma.DietEntryGetPayload<{ include: typeof WITH_NUTRIENTS }>;

export class EntriesLogic implements IEntriesLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: IClock,
  ) {}

  async listEntries(userId: string, query: ListEntriesQuery): Promise<PaginatedEntries> {
    const where = this.buildFilter(userId, query);
    const { skip, take } = toSkipTake(query);

    const [rows, totalItems, sums] = await Promise.all([
      this.prisma.dietEntry.findMany({
        where,
        include: WITH_NUTRIENTS,
        orderBy: { [query.sort]: query.order },
        skip,
        take,
      }),
      this.prisma.dietEntry.count({ where }),
      this.prisma.dietEntry.aggregate({
        where,
        _sum: { calories: true, proteinGrams: true, carbGrams: true, fatGrams: true },
      }),
    ]);

    return {
      ...paginate(
        rows.map((row) => this.toResponse(row)),
        totalItems,
        query,
      ),
      totals: {
        calories: sums._sum.calories ?? 0,
        proteinGrams: sums._sum.proteinGrams ?? 0,
        carbGrams: sums._sum.carbGrams ?? 0,
        fatGrams: sums._sum.fatGrams ?? 0,
      },
    };
  }

  async getEntry(userId: string, id: string): Promise<EntryResponse> {
    const entry = await this.prisma.dietEntry.findFirst({
      where: { id, userId },
      include: WITH_NUTRIENTS,
    });

    if (!entry) {
      throw notFound('Food entry');
    }

    return this.toResponse(entry);
  }

  async createEntry(
    userId: string,
    request: CreateEntryRequest,
    source: EntrySource = 'manual',
  ): Promise<EntryResponse> {
    const entry = await this.prisma.dietEntry.create({
      data: this.toCreateData(userId, request, source),
      include: WITH_NUTRIENTS,
    });

    return this.toResponse(entry);
  }

  async createEntries(
    userId: string,
    requests: CreateEntryRequest[],
    source: EntrySource,
  ): Promise<EntryResponse[]> {
    const rows = await this.prisma.$transaction(
      requests.map((request) =>
        this.prisma.dietEntry.create({
          data: this.toCreateData(userId, request, source),
          include: WITH_NUTRIENTS,
        }),
      ),
    );

    return rows.map((row) => this.toResponse(row));
  }

  async updateEntry(
    userId: string,
    id: string,
    request: UpdateEntryRequest,
  ): Promise<EntryResponse> {
    if (Object.keys(request).length === 0) {
      throw badRequest('Provide at least one field to update.');
    }

    await this.ensureEntryOwned(userId, id);

    const entry = await this.prisma.dietEntry.update({
      where: { id },
      data: this.toUpdateData(request),
      include: WITH_NUTRIENTS,
    });

    return this.toResponse(entry);
  }

  async deleteEntry(userId: string, id: string): Promise<void> {
    await this.ensureEntryOwned(userId, id);
    await this.prisma.dietEntry.delete({ where: { id } });
  }

  private async ensureEntryOwned(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.dietEntry.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw notFound('Food entry');
    }
  }

  private buildFilter(userId: string, query: ListEntriesQuery): Prisma.DietEntryWhereInput {
    const where: Prisma.DietEntryWhereInput = { userId };

    if (query.from || query.to) {
      where.consumedOn = {
        ...(query.from ? { gte: startOfUtcDay(query.from) } : {}),
        ...(query.to ? { lte: startOfUtcDay(query.to) } : {}),
      };
    }

    if (query.mealType) {
      where.mealType = query.mealType;
    }

    if (query.search) {
      where.foodName = { contains: query.search, mode: 'insensitive' };
    }

    return where;
  }

  private toCreateData(userId: string, request: CreateEntryRequest, source: EntrySource) {
    const consumedAt = request.consumedAt ?? this.clock.now();

    return {
      userId,
      foodName: request.foodName,
      mealType: request.mealType,
      quantity: request.quantity,
      unit: request.unit,
      calories: request.calories,
      proteinGrams: request.proteinGrams ?? 0,
      carbGrams: request.carbGrams ?? 0,
      fatGrams: request.fatGrams ?? 0,
      consumedAt,
      consumedOn: this.resolveConsumedOn(request.consumedOn, consumedAt),
      source,
      notes: this.normaliseNotes(request.notes),
      micronutrients: { create: this.normaliseMicronutrients(request.micronutrients) },
    };
  }

  /**
   * Only these columns may be changed by a caller. Spreading the request object
   * instead would let anything Prisma recognises through — userId above all,
   * which would hand the row to another account.
   */
  private static readonly UPDATABLE = [
    'foodName',
    'mealType',
    'quantity',
    'unit',
    'calories',
    'proteinGrams',
    'carbGrams',
    'fatGrams',
  ] as const satisfies readonly (keyof UpdateEntryRequest)[];

  private toUpdateData(request: UpdateEntryRequest): Prisma.DietEntryUpdateInput {
    const { micronutrients, consumedAt, consumedOn, notes } = request;

    const allowed: Prisma.DietEntryUpdateInput = {};
    for (const field of EntriesLogic.UPDATABLE) {
      const value = request[field];
      if (value !== undefined) {
        Object.assign(allowed, { [field]: value });
      }
    }

    return {
      ...allowed,
      ...(notes !== undefined ? { notes: this.normaliseNotes(notes) } : {}),
      ...(consumedAt ? { consumedAt } : {}),
      ...(consumedOn || consumedAt
        ? { consumedOn: this.resolveConsumedOn(consumedOn, consumedAt ?? this.clock.now()) }
        : {}),
      ...(micronutrients
        ? {
            micronutrients: {
              deleteMany: {},
              create: this.normaliseMicronutrients(micronutrients),
            },
          }
        : {}),
    };
  }

  private resolveConsumedOn(consumedOn: string | undefined, consumedAt: Date): Date {
    return consumedOn ? fromDateKey(consumedOn) : startOfUtcDay(consumedAt);
  }

  private normaliseNotes(notes: string | undefined): string | null {
    return notes?.trim() ? notes.trim().slice(0, 500) : null;
  }

  private normaliseMicronutrients(input: MicronutrientInput[] = []) {
    const byKey = new Map<string, { nutrient: string; amount: number; unit: string }>();

    for (const item of input) {
      byKey.set(item.nutrient, {
        nutrient: item.nutrient,
        amount: item.amount,
        unit: unitForNutrient(item.nutrient, item.unit ?? 'mg'),
      });
    }

    return [...byKey.values()];
  }

  private toResponse(entry: EntryRecord): EntryResponse {
    return {
      id: entry.id,
      foodName: entry.foodName,
      mealType: entry.mealType as MealType,
      quantity: entry.quantity,
      unit: entry.unit,
      calories: entry.calories,
      macros: {
        proteinGrams: entry.proteinGrams,
        carbGrams: entry.carbGrams,
        fatGrams: entry.fatGrams,
      },
      micronutrients: entry.micronutrients.map((item) => ({
        nutrient: item.nutrient,
        label: labelForNutrient(item.nutrient),
        amount: item.amount,
        unit: item.unit,
      })),
      consumedAt: entry.consumedAt.toISOString(),
      consumedOn: entry.consumedOn.toISOString().slice(0, 10),
      source: entry.source as EntrySource,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
