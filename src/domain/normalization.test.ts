import { describe, expect, test } from 'vitest';
import { normalizeLocalRows, parseMetricValue } from './normalization.js';

describe('parseMetricValue', () => {
  test('parses Brazilian currency and decimal formats', () => {
    expect(parseMetricValue('R$ 126.699,52')).toBe(126699.52);
    expect(parseMetricValue('18')).toBe(18);
    expect(parseMetricValue('0,7')).toBe(0.7);
  });

  test('treats blank or non-sale labels as missing metric values', () => {
    expect(parseMetricValue('')).toBeNull();
    expect(parseMetricValue('Sem Venda')).toBeNull();
    expect(parseMetricValue(null)).toBeNull();
  });
});

describe('normalizeLocalRows', () => {
  test('normalizes local tabular rows into ranking rows', () => {
    const rows = normalizeLocalRows([
      {
        period: '2026-05-01',
        role: 'closer',
        memberName: 'Macedo Lucas Rodrigues',
        revenue: 'R$ 126.699,00',
        logos: '7',
        sourceChannel: 'Lead Broker',
      },
      {
        period: '2026-05-01',
        role: 'sdr',
        memberName: 'Wilson Junior',
        meetingsHeld: '29',
        sourceChannel: 'Inbound',
      },
    ]);

    expect(rows).toEqual([
      {
        period: '2026-05-01',
        role: 'closer',
        memberId: 'closer-macedo-lucas-rodrigues',
        memberName: 'Macedo Lucas Rodrigues',
        revenue: 126699,
        logos: 7,
        meetingsHeld: null,
        sourceChannel: 'Lead Broker',
      },
      {
        period: '2026-05-01',
        role: 'sdr',
        memberId: 'sdr-wilson-junior',
        memberName: 'Wilson Junior',
        revenue: null,
        logos: null,
        meetingsHeld: 29,
        sourceChannel: 'Inbound',
      },
    ]);
  });
});
