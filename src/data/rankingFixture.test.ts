import { describe, expect, test } from 'vitest';
import { buildRanking } from '../domain/ranking.js';
import { periodFilters, rankingRows } from './rankingFixture.js';

describe('rankingFixture', () => {
  test('exposes real monthly CDR periods from the source spreadsheet', () => {
    expect(periodFilters.map((period) => period.label)).toEqual(['Maio/2026']);
  });

  test('maps May closers without treating Lucas Moura as closer', () => {
    const mayPeriod = periodFilters[0];
    const result = buildRanking(rankingRows, mayPeriod);

    expect(result.closers.map((entry) => entry.memberName)).toEqual([
      'Lucas Macedo',
      'Miguel de Oliveira Guimarães Vieira',
      'Carlos Guerra',
    ]);
    expect(result.closers[0]).toEqual(
      expect.objectContaining({
        memberId: 'lucas-macedo',
        revenue: 126698.52,
        logos: 7,
      }),
    );
    expect(result.closers.map((entry) => entry.memberName)).not.toContain(
      'Lucas Moura',
    );
    expect(result.closers.map((entry) => entry.memberName)).not.toContain(
      'Bruno Alfradique',
    );
  });

  test('maps May SDR aliases from source names to display names', () => {
    const mayPeriod = periodFilters[0];
    const result = buildRanking(rankingRows, mayPeriod);

    expect(result.sdrs.map((entry) => entry.memberName)).toEqual([
      'Wilson Junior',
      'Lucas Moura',
      'Lucas Macedo',
    ]);
    expect(result.sdrs.map((entry) => entry.meetingsHeld)).toEqual([19, 15, 1]);
  });
});
