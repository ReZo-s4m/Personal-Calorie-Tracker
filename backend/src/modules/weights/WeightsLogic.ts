import type { PrismaClient, WeighIn } from '@prisma/client';
import { fromDateKey, startOfUtcDay, toDateKey } from '../../common/dates.js';
import { notFound } from '../../common/errors.js';
import { paginate, toSkipTake, type Paginated } from '../../common/pagination.js';
import type { IClock } from '../../common/clock.js';
import type { IWeightsLogic } from './IWeightsLogic.js';
import type {
  CreateWeightRequest,
  ListWeightsQuery,
  WeightResponse,
  WeightSummary,
} from './models/weights.models.js';

export class WeightsLogic implements IWeightsLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: IClock,
  ) {}

  async logWeight(userId: string, request: CreateWeightRequest): Promise<WeightResponse> {
    const loggedOn = request.loggedOn
      ? fromDateKey(request.loggedOn)
      : startOfUtcDay(this.clock.now());
    const note = request.note?.trim() ? request.note.trim() : null;

    const row = await this.prisma.weighIn.upsert({
      where: { userId_loggedOn: { userId, loggedOn } },
      create: { userId, kg: request.kg, loggedOn, note },
      update: { kg: request.kg, note },
    });

    return this.toResponse(row);
  }

  async getLatestWeight(userId: string): Promise<WeightResponse | null> {
    const row = await this.prisma.weighIn.findFirst({
      where: { userId },
      orderBy: { loggedOn: 'desc' },
    });

    return row ? this.toResponse(row) : null;
  }

  async summariseWeights(userId: string, recentCount = 8): Promise<WeightSummary> {
    const recent = await this.prisma.weighIn.findMany({
      where: { userId },
      orderBy: { loggedOn: 'desc' },
      take: Math.max(2, recentCount),
    });

    return {
      latest: recent[0] ? this.toResponse(recent[0]) : null,
      previous: recent[1] ? this.toResponse(recent[1]) : null,
      recent: recent.map((row) => this.toResponse(row)),
    };
  }

  async listWeights(userId: string, query: ListWeightsQuery): Promise<Paginated<WeightResponse>> {
    const where = { userId };
    const { skip, take } = toSkipTake(query);

    const [rows, totalItems] = await Promise.all([
      this.prisma.weighIn.findMany({ where, orderBy: { loggedOn: 'desc' }, skip, take }),
      this.prisma.weighIn.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.toResponse(row)),
      totalItems,
      query,
    );
  }

  async deleteWeight(userId: string, id: string): Promise<void> {
    await this.ensureWeightOwned(userId, id);
    await this.prisma.weighIn.delete({ where: { id } });
  }

  private async ensureWeightOwned(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.weighIn.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw notFound('Weight log');
    }
  }

  private toResponse(row: WeighIn): WeightResponse {
    return {
      id: row.id,
      kg: row.kg,
      loggedOn: toDateKey(row.loggedOn),
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
