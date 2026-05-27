import { describe, expect, test } from 'vitest';
import {
  buildRanking,
  type PeriodFilter,
  type RawRankingRow,
} from './ranking.js';

const mayPeriod: PeriodFilter = {
  start: '2026-05-01',
  end: '2026-05-31',
  label: 'Maio/2026',
};

const rows: readonly RawRankingRow[] = [
  {
    period: '2026-05-01',
    role: 'closer',
    memberId: 'closer-macedo',
    memberName: 'Macedo Lucas Rodrigues',
    revenue: 126699,
    logos: 7,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-04',
    role: 'closer',
    memberId: 'closer-miguel',
    memberName: 'Miguel de Oliveira Guimarães Vieira',
    revenue: 17984,
    logos: 1,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-08',
    role: 'closer',
    memberId: 'closer-carlos',
    memberName: 'Carlos Guerra',
    revenue: 0,
    logos: 0,
    sourceChannel: 'Outbound',
  },
  {
    period: '2026-05-12',
    role: 'closer',
    memberId: 'closer-tiebreak',
    memberName: 'Closer Desempate',
    revenue: 17984,
    logos: 2,
    sourceChannel: 'Outbound',
  },
  {
    period: '2026-05-02',
    role: 'sdr',
    memberId: 'sdr-lucas',
    memberName: 'Lucas Vieira',
    meetingsHeld: 18,
    sourceChannel: 'Inbound',
  },
  {
    period: '2026-05-03',
    role: 'sdr',
    memberId: 'sdr-wilson',
    memberName: 'Wilson Junior',
    meetingsHeld: 29,
    sourceChannel: 'Inbound',
  },
  {
    period: '2026-05-04',
    role: 'sdr',
    memberId: 'sdr-macedo',
    memberName: 'Macedo Lucas Rodrigues',
    meetingsHeld: 25,
    sourceChannel: 'Outbound',
  },
  {
    period: '2026-04-15',
    role: 'sdr',
    memberId: 'sdr-old',
    memberName: 'Fora do Período',
    meetingsHeld: 99,
    sourceChannel: 'Inbound',
  },
];

describe('buildRanking', () => {
  test('orders closers by revenue and breaks ties by logos', () => {
    const result = buildRanking(rows, mayPeriod);

    expect(result.closers.map((entry) => entry.memberName)).toEqual([
      'Macedo Lucas Rodrigues',
      'Closer Desempate',
      'Miguel de Oliveira Guimarães Vieira',
      'Carlos Guerra',
    ]);
    expect(result.closers.map((entry) => entry.position)).toEqual([1, 2, 3, 4]);
    expect(result.closers[0]?.revenue).toBe(126699);
    expect(result.totals.revenue).toBe(162667);
    expect(result.totals.logos).toBe(10);
  });

  test('uses member id as final deterministic closer tie-breaker', () => {
    const result = buildRanking(
      [
        {
          period: '2026-05-01',
          role: 'closer',
          memberId: 'closer-z',
          memberName: 'Mesmo Nome',
          revenue: 10000,
          logos: 1,
        },
        {
          period: '2026-05-01',
          role: 'closer',
          memberId: 'closer-a',
          memberName: 'Mesmo Nome',
          revenue: 10000,
          logos: 1,
        },
      ],
      mayPeriod,
    );

    expect(result.closers.map((entry) => entry.memberId)).toEqual([
      'closer-a',
      'closer-z',
    ]);
  });

  test('orders SDRs by meetings held inside the selected period', () => {
    const result = buildRanking(rows, mayPeriod);

    expect(result.sdrs.map((entry) => entry.memberName)).toEqual([
      'Wilson Junior',
      'Macedo Lucas Rodrigues',
      'Lucas Vieira',
    ]);
    expect(result.totals.meetingsHeld).toBe(72);
  });

  test('ignores rows outside the selected period', () => {
    const result = buildRanking(rows, {
      start: '2026-04-01',
      end: '2026-04-30',
      label: 'Abril/2026',
    });

    expect(result.closers).toEqual([]);
    expect(result.sdrs).toHaveLength(1);
    expect(result.sdrs[0]?.memberName).toBe('Fora do Período');
  });

  test('aggregates multiple valid rows for the same member in the period', () => {
    const result = buildRanking(
      [
        {
          period: '2026-05-01',
          role: 'closer',
          memberId: 'closer-macedo',
          memberName: 'Macedo Lucas Rodrigues',
          revenue: 100000,
          logos: 5,
          sourceChannel: 'Lead Broker',
        },
        {
          period: '2026-05-15',
          role: 'closer',
          memberId: 'closer-macedo',
          memberName: 'Macedo Lucas Rodrigues',
          revenue: 26699,
          logos: 2,
          sourceChannel: 'Outbound',
        },
      ],
      mayPeriod,
    );

    expect(result.closers).toHaveLength(1);
    expect(result.closers[0]).toEqual(
      expect.objectContaining({
        memberId: 'closer-macedo',
        revenue: 126699,
        logos: 7,
        sourceChannel: 'Múltiplos canais',
      }),
    );
  });

  test('flags inconsistent rows and keeps them out of rankings', () => {
    const result = buildRanking(
      [
        ...rows,
        {
          period: '2026-05-10',
          role: 'closer',
          memberId: 'missing-revenue',
          memberName: 'Closer Sem Receita',
          logos: 2,
        },
        {
          period: '2026-05-11',
          role: 'sdr',
          memberId: 'negative-meetings',
          memberName: 'SDR Negativo',
          meetingsHeld: -1,
        },
        {
          period: '2026-05-12',
          role: 'sdr',
          memberId: 'missing-name',
          memberName: '',
          meetingsHeld: 4,
        },
      ],
      mayPeriod,
    );

    expect(result.inconsistencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: 'missing-revenue',
          field: 'revenue',
        }),
        expect.objectContaining({
          memberId: 'negative-meetings',
          field: 'meetingsHeld',
        }),
        expect.objectContaining({
          memberId: 'missing-name',
          field: 'memberName',
        }),
      ]),
    );
    expect(
      result.closers.some((entry) => entry.memberId === 'missing-revenue'),
    ).toBe(false);
    expect(
      result.sdrs.some((entry) => entry.memberId === 'negative-meetings'),
    ).toBe(false);
  });

  test('marks the result as empty when no valid rows are available', () => {
    const result = buildRanking(
      [
        {
          period: '2026-05-15',
          role: 'closer',
          memberId: 'broken',
          memberName: '',
          revenue: null,
          logos: null,
        },
      ],
      mayPeriod,
    );

    expect(result.isEmpty).toBe(true);
    expect(result.closers).toEqual([]);
    expect(result.sdrs).toEqual([]);
  });
});
