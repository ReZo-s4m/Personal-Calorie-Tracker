import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { FixedClock } from '../../common/clock.js';
import { EntriesLogic } from './EntriesLogic.js';
import type { UpdateEntryRequest } from './models/entries.models.js';

const NOW = new Date('2026-08-15T09:00:00.000Z');

const ROW = {
  id: 'entry-1',
  userId: 'owner',
  foodName: 'Porridge',
  mealType: 'breakfast',
  quantity: 1,
  unit: 'bowl',
  calories: 420,
  proteinGrams: 12,
  carbGrams: 68,
  fatGrams: 9,
  consumedAt: NOW,
  consumedOn: new Date('2026-08-15T00:00:00.000Z'),
  source: 'manual',
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
  micronutrients: [],
};

/** Records what reached Prisma, so we can assert on the columns actually written. */
function serviceWithCapture() {
  const captured: { data?: Record<string, unknown> } = {};

  const prisma = {
    dietEntry: {
      findFirst: async () => ({ id: ROW.id }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        captured.data = data;
        return ROW;
      },
    },
  } as unknown as PrismaClient;

  return { service: new EntriesLogic(prisma, new FixedClock(NOW)), captured };
}

describe('EntriesLogic.updateEntry', () => {
  it('writes the fields the caller is allowed to change', async () => {
    const { service, captured } = serviceWithCapture();

    await service.updateEntry('owner', 'entry-1', { foodName: 'Oats', calories: 400 });

    assert.equal(captured.data?.foodName, 'Oats');
    assert.equal(captured.data?.calories, 400);
  });

  it('refuses to hand the row to another account through a forged patch', async () => {
    const { service, captured } = serviceWithCapture();

    // What a crafted chat pendingAction could previously smuggle in.
    const forged = {
      foodName: 'Oats',
      userId: 'someone-else',
      source: 'manual',
      createdAt: new Date(0),
      id: 'another-entry',
    } as unknown as UpdateEntryRequest;

    await service.updateEntry('owner', 'entry-1', forged);

    assert.equal(captured.data?.foodName, 'Oats', 'the legitimate field still applies');
    assert.equal(captured.data?.userId, undefined, 'userId must never reach the update');
    assert.equal(captured.data?.source, undefined, 'source is set by the writer, not the caller');
    assert.equal(captured.data?.createdAt, undefined);
    assert.equal(captured.data?.id, undefined);
  });

  it('still rejects an update that names no fields at all', async () => {
    const { service } = serviceWithCapture();

    await assert.rejects(
      () => service.updateEntry('owner', 'entry-1', {}),
      /at least one field/i,
    );
  });
});
