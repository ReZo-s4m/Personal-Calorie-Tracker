import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hintFromText, mealTypeFromText, resolveAmong, type EntryRef } from './resolve.js';

const rice: EntryRef = {
  entryId: 'rice',
  foodName: 'Rice',
  mealType: 'lunch',
  quantity: 1,
  unit: 'cup',
  calories: 200,
  consumedOn: '2026-08-14',
};

const salmon: EntryRef = {
  entryId: 'salmon',
  foodName: 'Salmon',
  mealType: 'snack',
  quantity: 1,
  unit: 'serving',
  calories: 520,
  consumedOn: '2026-08-14',
};

const yogurt: EntryRef = {
  entryId: 'yogurt',
  foodName: 'Greek yogurt',
  mealType: 'breakfast',
  quantity: 200,
  unit: 'g',
  calories: 146,
  consumedOn: '2026-08-14',
};

describe('chatResolve', () => {
  it('returns none for an empty list', () => {
    assert.equal(resolveAmong([], {}).status, 'none');
  });

  it('returns the only row when there is one safe match', () => {
    const result = resolveAmong([rice], {});
    assert.equal(result.status, 'one');
    if (result.status === 'one') {
      assert.equal(result.entry.entryId, 'rice');
    }
  });

  it('resolves lunch from several yesterday meals', () => {
    const result = resolveAmong([yogurt, rice, salmon], { mealType: 'lunch' });
    assert.equal(result.status, 'one');
    if (result.status === 'one') {
      assert.equal(result.entry.foodName, 'Rice');
    }
  });

  it('keeps several candidates when the hint is vague', () => {
    const result = resolveAmong([yogurt, rice, salmon], {});
    assert.equal(result.status, 'many');
    if (result.status === 'many') {
      assert.equal(result.entries.length, 3);
    }
  });

  it('reads meal type and a food name out of a short follow-up', () => {
    assert.equal(mealTypeFromText('Lunch'), 'lunch');
    assert.equal(hintFromText('the salmon').search, 'salmon');
  });
});

describe('hintFromText picks an index or an amount', () => {
  it('reads a bare number as the choice, including double digits', () => {
    assert.equal(hintFromText('3').index, 3);
    assert.equal(hintFromText('10').index, 10);
    assert.equal(hintFromText('number 10').index, 10);
    assert.equal(hintFromText('10').calories, undefined);
  });

  it('reads a number with a unit as calories', () => {
    assert.equal(hintFromText('the 450 kcal one').calories, 450);
    assert.equal(hintFromText('the 450 kcal one').index, undefined);
  });

  it('still treats a bare amount inside a sentence as calories', () => {
    assert.equal(hintFromText('delete the 520 salmon').calories, 520);
  });
});
