import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStats, recordDailyCompletion } from '../src/lib/game-utils.js';

const base = { played: 8, wins: 5, streak: 3, maxStreak: 4, lastPlayedDate: '2026-07-10' };

test('keeps the streak during the following day', () => {
  assert.equal(normalizeStats(base, '2026-07-11').streak, 3);
});

test('expires the streak after one full missed day', () => {
  assert.equal(normalizeStats(base, '2026-07-12').streak, 0);
});

test('completing a daily extends the streak even without a perfect result', () => {
  const next = recordDailyCompletion(base, '2026-07-11', false);
  assert.equal(next.streak, 4);
  assert.equal(next.wins, 5);
  assert.equal(next.played, 9);
});

test('completing after a missed day starts again at one', () => {
  assert.equal(recordDailyCompletion(base, '2026-07-12', true).streak, 1);
});

test('the same daily cannot increment twice', () => {
  const once = recordDailyCompletion(base, '2026-07-11', true);
  assert.deepEqual(recordDailyCompletion(once, '2026-07-11', true), once);
});
