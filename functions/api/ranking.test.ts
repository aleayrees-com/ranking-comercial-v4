import { describe, expect, test, vi } from 'vitest';
import { discoverMonthlyCdrSheets, onRequestGet } from './ranking.js';

describe('/api/ranking', () => {
  test('discovers monthly CDR sheets from public spreadsheet HTML', () => {
    const html = [
      createSheetMetadataFragment('1481288268', 'CDR MAIO/26'),
      createSheetMetadataFragment('1368144463', 'CDR JUNHO/26'),
      createSheetMetadataFragment('1969680010', 'Cópia de CDR MAIO/26'),
      createSheetMetadataFragment('1083453135', 'CDP OUTBOUND'),
    ].join(',');

    expect(discoverMonthlyCdrSheets(html)).toEqual([
      {
        end: '2026-06-30',
        gid: '1368144463',
        label: 'Junho/2026',
        start: '2026-06-01',
        title: 'CDR JUNHO/26',
      },
      {
        end: '2026-05-31',
        gid: '1481288268',
        label: 'Maio/2026',
        start: '2026-05-01',
        title: 'CDR MAIO/26',
      },
    ]);
  });

  test('returns latest rows and period filters without loading previous CSVs by default', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const value = String(url);

      if (value.includes('/edit?usp=sharing')) {
        return new Response(
          [
            createSheetMetadataFragment('123456789', 'CDR SETEMBRO/25'),
            createSheetMetadataFragment('1481288268', 'CDR MAIO/26'),
            createSheetMetadataFragment('1368144463', 'CDR JUNHO/26'),
          ].join(','),
          { status: 200 },
        );
      }

      if (value.includes('gid=1481288268')) {
        return new Response(
          createCsv([
            row({ 0: 'DATA INÍCIO:', 1: '01/05/2026' }),
            row({ 0: 'DATA FIM:', 1: '31/05/2026' }),
            row({
              182: 'META',
              183: 'Carlos Guerra',
              184: 'Macedo Lucas Rodrigues',
            }),
            row({ 182: 'REALIZADO', 183: 'R$ 1.000', 184: 'R$ 2.000' }),
            row({ 182: 'Vendas', 183: '1', 184: '2' }),
          ]),
          { status: 200 },
        );
      }

      if (value.includes('gid=1368144463')) {
        return new Response(
          createCsv([
            row({ 0: 'DATA INÍCIO:', 1: '01/06/2026' }),
            row({ 0: 'DATA FIM:', 1: '30/06/2026' }),
            row({
              200: 'META',
              201: 'Lucas Vieira',
              202: 'Wilson Junior',
              203: 'Emanuella',
              204: 'Pedro Paulo',
              205: 'Matheus Caruzo',
            }),
            row({
              200: 'REALIZADO',
              201: '1',
              202: '2',
              203: '3',
              204: '4',
              205: '5',
            }),
          ]),
          { status: 200 },
        );
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGet();
    const payload = (await response.json()) as {
      readonly periodFilters: readonly { readonly label: string }[];
      readonly isPartial: boolean;
      readonly rows: readonly { readonly memberName: string }[];
      readonly skippedSheets: readonly string[];
      readonly sourceSpreadsheet: { readonly sheet: string };
    };

    expect(response.status).toBe(200);
    expect(payload.isPartial).toBe(false);
    expect(payload.skippedSheets).toEqual([]);
    expect(payload.periodFilters.map((period) => period.label)).toEqual([
      'Junho/2026',
      'Maio/2026',
    ]);
    expect(payload.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberName: 'Emanuella' }),
        expect.objectContaining({ memberName: 'Pedro Paulo' }),
        expect.objectContaining({ memberName: 'Matheus Caruzo' }),
      ]),
    );
    expect(payload.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberName: 'Carlos Guerra' }),
      ]),
    );
    expect(payload.sourceSpreadsheet.sheet).toBe('CDR JUNHO/26');
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('gid=1481288268'),
      ),
    ).toBe(false);
  });

  test('loads only requested monthly CSV when period is selected', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const value = String(url);

      if (value.includes('/edit?usp=sharing')) {
        return new Response(
          [
            createSheetMetadataFragment('1481288268', 'CDR MAIO/26'),
            createSheetMetadataFragment('1368144463', 'CDR JUNHO/26'),
          ].join(','),
          { status: 200 },
        );
      }

      if (value.includes('gid=1481288268')) {
        return new Response(
          createCsv([
            row({ 0: 'DATA INÍCIO:', 1: '01/05/2026' }),
            row({ 0: 'DATA FIM:', 1: '31/05/2026' }),
            row({
              182: 'META',
              183: 'Carlos Guerra',
              184: 'Macedo Lucas Rodrigues',
            }),
            row({ 182: 'REALIZADO', 183: 'R$ 1.000', 184: 'R$ 2.000' }),
            row({ 182: 'Vendas', 183: '1', 184: '2' }),
          ]),
          { status: 200 },
        );
      }

      if (value.includes('gid=1368144463')) {
        return new Response('junho não deveria ser carregado', { status: 500 });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGet({
      request: new Request(
        'https://rank.v4alfradique.com/api/ranking?period=2026-05',
      ),
    });
    const payload = (await response.json()) as {
      readonly periodFilters: readonly { readonly label: string }[];
      readonly rows: readonly { readonly memberName: string }[];
      readonly sourceSpreadsheet: { readonly sheet: string };
    };

    expect(response.status).toBe(200);
    expect(payload.periodFilters.map((period) => period.label)).toEqual([
      'Junho/2026',
      'Maio/2026',
    ]);
    expect(payload.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberName: 'Carlos Guerra' }),
      ]),
    );
    expect(payload.sourceSpreadsheet.sheet).toBe('CDR MAIO/26');
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('gid=1368144463'),
      ),
    ).toBe(false);
  });

  test('fails when the latest monthly CDR sheet cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const value = String(url);

        if (value.includes('/edit?usp=sharing')) {
          return new Response(
            [
              createSheetMetadataFragment('1481288268', 'CDR MAIO/26'),
              createSheetMetadataFragment('1368144463', 'CDR JUNHO/26'),
            ].join(','),
            { status: 200 },
          );
        }

        if (value.includes('gid=1368144463')) {
          return new Response('erro junho', { status: 500 });
        }

        if (value.includes('gid=1481288268')) {
          return new Response(
            createCsv([
              row({ 0: 'DATA INÍCIO:', 1: '01/05/2026' }),
              row({ 0: 'DATA FIM:', 1: '31/05/2026' }),
              row({ 182: 'META', 183: 'Carlos Guerra' }),
              row({ 182: 'REALIZADO', 183: 'R$ 1.000' }),
              row({ 182: 'Vendas', 183: '1' }),
            ]),
            { status: 200 },
          );
        }

        return new Response('not found', { status: 404 });
      }),
    );

    const response = await onRequestGet();
    const payload = (await response.json()) as { readonly message: string };

    expect(response.status).toBe(502);
    expect(payload.message).toContain(
      'Falha ao ler a aba mensal mais recente CDR JUNHO/26',
    );
  });

  test('fails when public sheet metadata does not expose monthly CDR sheets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const value = String(url);

        if (value.includes('/edit?usp=sharing')) {
          return new Response('login required', { status: 200 });
        }

        return new Response('not found', { status: 404 });
      }),
    );

    const response = await onRequestGet();
    const payload = (await response.json()) as { readonly message: string };

    expect(response.status).toBe(502);
    expect(payload.message).toBe('Nenhuma aba mensal CDR encontrada.');
  });
});

function createSheetMetadataFragment(gid: string, title: string): string {
  return `[21350203,"[13,0,\\"${gid}\\",[{\\"1\\":[[0,0,\\"${title}\\"]]}],67,195]"]`;
}

function row(cells: Record<number, string>): readonly string[] {
  const values = Array.from({ length: 220 }, () => '');

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
