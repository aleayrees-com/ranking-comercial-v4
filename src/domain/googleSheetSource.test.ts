import { describe, expect, test } from 'vitest';
import { parseGoogleSheetRankingCsv } from './googleSheetSource.js';

describe('parseGoogleSheetRankingCsv', () => {
  test('normalizes the public Google Sheet export into ranking rows', () => {
    const csv = createCsv([
      row({ 0: 'DATA INÍCIO:', 1: '01/05/2026' }),
      row({ 0: 'DATA FIM:', 1: '31/05/2026' }),
      row({
        6: 'DATA DA COMPRA',
        13: 'VALOR',
        14: 'STATUS',
        15: 'MRR',
        17: 'DATA DE\nFECHAMENTO',
        27: 'ACONTECIDA',
        29: 'SDR',
        30: 'CLOSER',
        31: 'PRODUTO\nVENDIDO',
      }),
      row({
        6: '20/05/2026',
        14: 'Fechado',
        15: 'R$ 23.604,00',
        17: '21/05/2026',
        27: '21/05/2026',
        29: 'Wilson Junior',
        30: 'Macedo Lucas Rodrigues',
        31: 'Estruturação Estratégica',
      }),
      row({
        6: '20/05/2026',
        14: 'Fechado',
        15: '17.984',
        17: '21/05/2026',
        27: '21/05/2026',
        29: 'Lucas Vieira',
        30: 'Miguel de Oliveira Guimarães Vieira',
        31: 'Estruturação Estratégica',
      }),
      row({
        6: '20/05/2026',
        14: 'Fechado',
        15: '10.000',
        17: '21/05/2026',
        27: '21/05/2026',
        29: 'Wilson Junior',
        30: 'Bruno Alfradique',
        31: 'Estruturação Estratégica',
      }),
      row({
        6: '22/05/2026',
        15: 'R$ 99.999,00',
        29: 'Wilson Junior',
        30: 'Macedo Lucas Rodrigues',
      }),
      row({
        1: 'Wilson Junior',
        2: 'Lucas Vieira',
        3: 'Macedo Lucas Rodrigues',
      }),
      row({ 0: 'LEADS', 1: '39', 2: '14', 3: '1' }),
      row({ 0: 'ACONTECIDAS', 1: '17', 2: '13', 3: '1' }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv);

    expect(result.periods).toEqual([
      {
        label: 'Maio/2026',
        start: '2026-05-01',
        end: '2026-05-31',
      },
    ]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        role: 'closer',
        memberId: 'lucas-macedo',
        memberName: 'Lucas Macedo',
        revenue: 23604,
        logos: 1,
      }),
      expect.objectContaining({
        role: 'closer',
        memberId: 'miguel-de-oliveira-guimaraes-vieira',
        memberName: 'Miguel de Oliveira Guimarães Vieira',
        revenue: 17984,
        logos: 1,
      }),
      expect.objectContaining({
        role: 'closer',
        memberId: 'carlos-guerra',
        memberName: 'Carlos Guerra',
        revenue: 0,
        logos: 0,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'wilson-de-carvalho-junior',
        memberName: 'Wilson Junior',
        meetingsHeld: 17,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-moura',
        memberName: 'Lucas Moura',
        meetingsHeld: 13,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-macedo',
        memberName: 'Lucas Macedo',
        meetingsHeld: 1,
      }),
    ]);
  });
});

function row(cells: Record<number, string>): readonly string[] {
  const values = Array.from({ length: 34 }, () => '');

  for (const [index, value] of Object.entries(cells)) {
    values[Number(index)] = value;
  }

  return values;
}

function createCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((cells) => cells.map(escapeCsvCell).join(',')).join('\n');
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
