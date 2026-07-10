import { describe, expect, test } from 'vitest';
import { parseGoogleSheetRankingCsv } from './googleSheetSource.js';

describe('parseGoogleSheetRankingCsv', () => {
  test('normalizes the CDR Maio operational summary into ranking rows', () => {
    const csv = createCsv([
      row({
        169: 'META',
        170: 'Lucas Vieira',
        171: 'Wilson Junior',
        172: 'Macedo Lucas Rodrigues',
        180: 'Total Time',
        182: 'META',
        183: 'Carlos Guerra',
        184: 'Macedo Lucas Rodrigues',
        185: 'Miguel de Oliveira Guimarães Vieira',
        187: 'TOTAL',
      }),
      row({
        170: '20',
        171: '25',
        172: '5',
        183: 'R$ 100.000',
        184: 'R$ 120.000',
        185: 'R$ 80.000',
      }),
      row({
        169: 'REALIZADO',
        170: '15',
        171: '19',
        172: '1',
        180: '34',
        182: 'REALIZADO',
        183: 'R$ 24.728,00',
        184: 'R$ 126.699',
        185: 'R$ 17.984',
        187: 'R$ 169.410,52',
      }),
      row({
        182: 'Vendas',
        183: '1',
        184: '7',
        185: '1',
        187: '9',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv);

    expect(result.sourceSpreadsheet.sheet).toBe('CDR MAIO/26');
    expect(result.rows).toEqual([
      expect.objectContaining({
        role: 'closer',
        memberId: 'carlos-guerra',
        memberName: 'Carlos Guerra',
        revenue: 24728,
        logos: 1,
        monthlyGoal: 100000,
      }),
      expect.objectContaining({
        role: 'closer',
        memberId: 'lucas-macedo',
        memberName: 'Macedo Lucas Rodrigues',
        revenue: 126699,
        logos: 7,
      }),
      expect.objectContaining({
        role: 'closer',
        memberId: 'miguel-de-oliveira-guimaraes-vieira',
        memberName: 'Miguel de Oliveira Guimarães Vieira',
        revenue: 17984,
        logos: 1,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-moura',
        memberName: 'Lucas Vieira',
        meetingsHeld: 15,
        monthlyGoal: 20,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'wilson-de-carvalho-junior',
        memberName: 'Wilson Junior',
        meetingsHeld: 19,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-macedo',
        memberName: 'Macedo Lucas Rodrigues',
        meetingsHeld: 1,
      }),
    ]);
  });

  test('includes a new closer from the official revenue and sales summary without hardcoded membership', () => {
    const csv = createCsv([
      row({
        182: 'META',
        183: 'Carlos Guerra',
        184: 'Marina Ávila',
        185: 'TOTAL',
      }),
      row({
        182: 'REALIZADO',
        183: 'R$ 24.728,00',
        184: 'R$ 31.500,00',
        185: 'R$ 56.228,00',
      }),
      row({
        182: 'Vendas',
        183: '1',
        184: '2',
        185: '3',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv);

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'closer',
          memberId: 'closer-marina-avila',
          memberName: 'Marina Ávila',
          revenue: 31500,
          logos: 2,
        }),
      ]),
    );
  });

  test('includes a new SDR or BDR from the official pre-sales summary without hardcoded membership', () => {
    const csv = createCsv([
      row({
        200: 'META',
        201: 'Wilson Junior',
        202: 'Rafaela Novaes',
        203: 'Total Time',
      }),
      row({
        200: 'REALIZADO',
        201: '7',
        202: '11',
        203: '18',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv, {
      gid: '1368144463',
      title: 'CDR JUNHO/26',
    });

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'sdr-rafaela-novaes',
          memberName: 'Rafaela Novaes',
          meetingsHeld: 11,
        }),
      ]),
    );
  });

  test('does not keep removed people in detail fallback rankings when they are absent from the sheet month', () => {
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
        30: 'Carlos Guerra',
        31: 'Estruturação Estratégica',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv);

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'closer',
          memberId: 'carlos-guerra',
          memberName: 'Carlos Guerra',
          revenue: 23604,
          logos: 1,
        }),
      ]),
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: 'lucas-macedo',
        }),
        expect.objectContaining({
          memberId: 'miguel-de-oliveira-guimaraes-vieira',
        }),
      ]),
    );
  });

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
        memberName: 'Macedo Lucas Rodrigues',
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
        role: 'sdr',
        memberId: 'wilson-de-carvalho-junior',
        memberName: 'Wilson Junior',
        meetingsHeld: 17,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-moura',
        memberName: 'Lucas Vieira',
        meetingsHeld: 13,
      }),
      expect.objectContaining({
        role: 'sdr',
        memberId: 'lucas-macedo',
        memberName: 'Macedo Lucas Rodrigues',
        meetingsHeld: 1,
      }),
    ]);
  });

  test('maps June pre-sales members from the operational summary', () => {
    const csv = createCsv([
      row({
        200: 'META',
        201: 'Macedo Lucas Rodrigues',
        202: 'Lucas Vieira',
        203: 'Wilson Junior',
        204: 'Emanuella',
        205: 'Pedro Paulo',
        206: 'Matheus Caruzo',
        207: 'XPTO 1',
        211: 'Total Time',
      }),
      row({
        200: 'REALIZADO',
        201: '1',
        202: '2',
        203: '3',
        204: '4',
        205: '5',
        206: '6',
        207: '99',
        211: '21',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv, {
      gid: '1368144463',
      title: 'CDR JUNHO/26',
    });

    expect(result.sourceSpreadsheet.sheet).toBe('CDR JUNHO/26');
    expect(result.periods).toEqual([
      {
        label: 'Junho/2026',
        start: '2026-06-01',
        end: '2026-06-30',
      },
    ]);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'gisela-emanuella-candido-costa-silva',
          memberName: 'Emanuella',
          meetingsHeld: 4,
        }),
        expect.objectContaining({
          role: 'sdr',
          memberId: 'pedro-paulo-dias-da-fonseca',
          memberName: 'Pedro Paulo',
          meetingsHeld: 5,
        }),
        expect.objectContaining({
          role: 'sdr',
          memberId: 'matheus-caruzo-monteiro-goncalves',
          memberName: 'Matheus Caruzo',
          meetingsHeld: 6,
        }),
      ]),
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: 'XPTO 1',
        }),
      ]),
    );
  });

  test('continues scanning for closers when the pre-sales summary has closer names', () => {
    const csv = createCsv([
      row({
        200: 'META',
        201: 'Macedo Lucas Rodrigues',
        202: 'Lucas Vieira',
        203: 'Miguel de Oliveira Guimarães Vieira',
        204: 'Emanuella',
        205: 'Pedro Paulo',
        206: 'Matheus Caruzo',
        211: 'Total Time',
        220: 'META',
        221: 'Carlos Guerra',
        222: 'Macedo Lucas Rodrigues',
        223: 'Miguel de Oliveira Guimarães Vieira',
        224: 'XPTO 5',
        225: 'TOTAL',
      }),
      row({
        200: 'REALIZADO',
        201: '12',
        202: '12',
        203: '2',
        204: '8',
        205: '7',
        206: '3',
        211: '44',
        220: 'REALIZADO',
        221: 'R$ 19.108,00',
        222: 'R$ 45.906',
        223: 'R$ 0',
        224: 'R$ 0',
        225: 'R$ 65.013,89',
      }),
      row({
        220: 'Vendas',
        221: '1',
        222: '6',
        223: '0',
        224: '0',
        225: '7',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv, {
      gid: '1368144463',
      title: 'CDR JUNHO/26',
    });

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'closer',
          memberId: 'carlos-guerra',
          memberName: 'Carlos Guerra',
          revenue: 19108,
          logos: 1,
        }),
        expect.objectContaining({
          role: 'closer',
          memberId: 'lucas-macedo',
          memberName: 'Macedo Lucas Rodrigues',
          revenue: 45906,
          logos: 6,
        }),
        expect.objectContaining({
          role: 'closer',
          memberId: 'miguel-de-oliveira-guimaraes-vieira',
          memberName: 'Miguel de Oliveira Guimarães Vieira',
          revenue: 0,
          logos: 0,
        }),
      ]),
    );
  });

  test('keeps known pre-sales members with zero meetings when summary cells are blank', () => {
    const csv = createCsv([
      row({
        200: 'META',
        201: 'Lucas Vieira',
        202: 'Wilson Junior',
        203: 'Macedo Lucas Rodrigues',
        204: 'Emanuella',
        205: 'Pedro Paulo',
        211: 'Total Time',
      }),
      row({
        200: 'REALIZADO',
        201: '2',
        202: '1',
        203: '',
        204: '',
        205: '',
        211: '3',
      }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv, {
      gid: '1368144463',
      title: 'CDR JUNHO/26',
    });

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'gisela-emanuella-candido-costa-silva',
          memberName: 'Emanuella',
          meetingsHeld: 0,
        }),
        expect.objectContaining({
          role: 'sdr',
          memberId: 'pedro-paulo-dias-da-fonseca',
          memberName: 'Pedro Paulo',
          meetingsHeld: 0,
        }),
      ]),
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'lucas-macedo',
        }),
      ]),
    );
  });

  test('excludes legacy Lucas Macedo zero row from old happened-meetings summary', () => {
    const csv = createCsv([
      row({ 0: 'DATA INÍCIO:', 1: '01/06/2026' }),
      row({ 0: 'DATA FIM:', 1: '30/06/2026' }),
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
        1: 'Wilson Junior',
        2: 'Lucas Vieira',
        3: 'Macedo Lucas Rodrigues',
        4: 'Emanuella',
      }),
      row({ 0: 'LEADS', 1: '2', 2: '2', 3: '0', 4: '1' }),
      row({ 0: 'ACONTECIDAS', 1: '1', 2: '1', 3: '0', 4: '0' }),
    ]);

    const result = parseGoogleSheetRankingCsv(csv, {
      gid: '1368144463',
      title: 'CDR JUNHO/26',
    });

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'wilson-de-carvalho-junior',
          meetingsHeld: 1,
        }),
        expect.objectContaining({
          role: 'sdr',
          memberId: 'gisela-emanuella-candido-costa-silva',
          meetingsHeld: 0,
        }),
      ]),
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'sdr',
          memberId: 'lucas-macedo',
        }),
      ]),
    );
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
