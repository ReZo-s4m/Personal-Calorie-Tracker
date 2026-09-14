import type { Target, PrismaClient } from '@prisma/client';
import type { IClock } from '../../common/clock.js';
import { startOfUtcDay } from '../../common/dates.js';
import { notFound } from '../../common/errors.js';
import { paginate, toSkipTake, type Paginated } from '../../common/pagination.js';
import type { ITargetsLogic } from './ITargetsLogic.js';
import type {
  CreateTargetRequest,
  TargetResponse,
  ListTargetsQuery,
} from './models/targets.models.js';

export class TargetsLogic implements ITargetsLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: IClock,
  ) {}

  async setTarget(userId: string, request: CreateTargetRequest): Promise<TargetResponse> {
    const effectiveFrom = startOfUtcDay(request.effectiveFrom ?? this.clock.now());

    const existing = await this.prisma.target.findFirst({
      where: { userId, effectiveFrom },
      select: { id: true },
    });

    const data = {
      userId,
      dailyCalories: request.dailyCalories,
      proteinGrams: request.proteinGrams,
      carbGrams: request.carbGrams,
      fatGrams: request.fatGrams,
      weightKg: request.targetWeightKg ?? null,
      effectiveFrom,
    };

    const goal = existing
      ? await this.prisma.target.update({ where: { id: existing.id }, data })
      : await this.prisma.target.create({ data });

    return this.toResponse(goal);
  }

  async getTargetForDate(userId: string, date: Date): Promise<TargetResponse | null> {
    const goal = await this.prisma.target.findFirst({
      where: { userId, effectiveFrom: { lte: startOfUtcDay(date) } },
      orderBy: { effectiveFrom: 'desc' },
    });

    return goal ? this.toResponse(goal) : null;
  }

  async getTargetsCovering(userId: string, from: Date, to: Date): Promise<TargetResponse[]> {
    const goals = await this.prisma.target.findMany({
      where: { userId, effectiveFrom: { lte: startOfUtcDay(to) } },
      orderBy: { effectiveFrom: 'desc' },
    });

    const firstRelevant = goals.findIndex((goal) => goal.effectiveFrom <= startOfUtcDay(from));

    return (firstRelevant === -1 ? goals : goals.slice(0, firstRelevant + 1)).map((goal) =>
      this.toResponse(goal),
    );
  }

  async listTargets(userId: string, query: ListTargetsQuery): Promise<Paginated<TargetResponse>> {
    const where = { userId };
    const { skip, take } = toSkipTake(query);

    const [rows, totalItems] = await Promise.all([
      this.prisma.target.findMany({ where, orderBy: { effectiveFrom: 'desc' }, skip, take }),
      this.prisma.target.count({ where }),
    ]);

    return paginate(
      rows.map((goal) => this.toResponse(goal)),
      totalItems,
      query,
    );
  }

  async deleteTarget(userId: string, id: string): Promise<void> {
    await this.ensureTargetOwned(userId, id);
    await this.prisma.target.delete({ where: { id } });
  }

  private async ensureTargetOwned(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.target.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw notFound('Goal');
    }
  }

  private toResponse(target: Target): TargetResponse {
    return {
      id: target.id,
      dailyCalories: target.dailyCalories,
      proteinGrams: target.proteinGrams,
      carbGrams: target.carbGrams,
      fatGrams: target.fatGrams,
      // the column is weightKg; the wire has always called it targetWeightKg
      targetWeightKg: target.weightKg,
      effectiveFrom: target.effectiveFrom.toISOString().slice(0, 10),
      createdAt: target.createdAt.toISOString(),
    };
  }
}
