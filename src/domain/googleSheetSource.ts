import {
  normalizeLocalRows,
  parseMetricValue,
  type LocalRankingSourceRow,
} from './normalization.js';
import type { PeriodFilter, RawRankingRow } from './ranking.js';

interface SheetRankingData {
  readonly periods: readonly PeriodFilter[];
  readonly rows: readonly RawRankingRow[];
  readonly sourceSpreadsheet: {
    readonly title: string;
    readonly url: string;
    readonly sheet: string;
    readonly timezone: string;
  };
}

interface SheetColumnIndexes {
  readonly purchaseDate: number;
  readonly status: number;
  readonly mrr: number;
  readonly closeDate: number;
  readonly happenedAt: number;
  readonly sdr: number;
  readonly closer: number;
  readonly productSold: number;
}

interface MemberMapping {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
}

const SOURCE_SPREADSHEET = {
  title: 'Controle de Resultados | Alfradique & Co RJ',
  url: 'https://docs.google.com/spreadsheets/d/1iqFf2dbfsG_tl2FB8TrPsBfjO3xkvQYrnvqheUPY9KE/edit?usp=sharing',
  sheet: 'CDR MAIO/26',
  timezone: 'America/Sao_Paulo',
} as const;

const DEFAULT_PERIOD: PeriodFilter = {
  label: 'Maio/2026',
  start: '2026-05-01',
  end: '2026-05-31',
};

const KNOWN_CLOSERS: readonly MemberMapping[] = [
  {
    id: 'lucas-macedo',
    name: 'Lucas Macedo',
    aliases: ['Lucas Macedo', 'Macedo Lucas Rodrigues', 'Macedo'],
  },
  {
    id: 'miguel-de-oliveira-guimaraes-vieira',
    name: 'Miguel de Oliveira Guimarães Vieira',
    aliases: ['Miguel', 'Miguel de Oliveira Guimarães Vieira'],
  },
  {
    id: 'carlos-guerra',
    name: 'Carlos Guerra',
    aliases: ['Carlos Guerra', 'Carlos'],
  },
];

const KNOWN_SDRS: readonly MemberMapping[] = [
  {
    id: 'wilson-de-carvalho-junior',
    name: 'Wilson Junior',
    aliases: ['Wilson Junior', 'Wilson de Carvalho Junior', 'Wilson'],
  },
  {
    id: 'lucas-moura',
    name: 'Lucas Moura',
    aliases: ['Lucas Moura', 'Lucas Vieira', 'lucasvieira@v4company.com'],
  },
  {
    id: 'lucas-macedo',
    name: 'Lucas Macedo',
    aliases: ['Lucas Macedo', 'Macedo Lucas Rodrigues', 'Macedo'],
  },
];

const IGNORED_CLOSER_KEYS = new Set(['bruno alfradique', 'bruno']);

export function parseGoogleSheetRankingCsv(csv: string): SheetRankingData {
  const table = parseCsv(csv);
  const period = detectPeriod(table);
  const headerIndex = table.findIndex((row) =>
    row.some((cell) => normalizeKey(cell) === 'data da compra'),
  );

  if (headerIndex < 0) {
    throw new Error('Cabeçalho da planilha não encontrado.');
  }

  const columns = getColumnIndexes(table[headerIndex]);
  const detailRows = table.slice(headerIndex + 1);
  const sourceRows = [
    ...createCloserSourceRows(detailRows, columns, period),
    ...createSdrSourceRows(table, detailRows, columns, period),
  ];

  return {
    periods: [period],
    rows: normalizeLocalRows(sourceRows),
    sourceSpreadsheet: SOURCE_SPREADSHEET,
  };
}

function createCloserSourceRows(
  rows: readonly (readonly string[])[],
  columns: SheetColumnIndexes,
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const byCloser = new Map<string, LocalRankingSourceRow>();

  for (const closer of KNOWN_CLOSERS) {
    byCloser.set(closer.id, {
      period: period.end,
      role: 'closer',
      memberId: closer.id,
      memberName: closer.name,
      revenue: 0,
      logos: 0,
      sourceChannel: 'Lead Broker',
    });
  }

  for (const row of rows) {
    const closer = resolveMember(row[columns.closer], KNOWN_CLOSERS);

    if (!closer || IGNORED_CLOSER_KEYS.has(normalizeKey(row[columns.closer]))) {
      continue;
    }

    const saleDate =
      parseSheetDate(row[columns.closeDate]) ??
      parseSheetDate(row[columns.purchaseDate]) ??
      period.end;

    if (
      saleDate < period.start ||
      saleDate > period.end ||
      !isClosedSale(row, columns)
    ) {
      continue;
    }

    const existing = byCloser.get(closer.id);
    const revenue = parseMetricValue(row[columns.mrr]) ?? 0;
    const logos = (parseMetricValue(existing?.logos) ?? 0) + 1;

    byCloser.set(closer.id, {
      period: period.end,
      role: 'closer',
      memberId: closer.id,
      memberName: closer.name,
      revenue: (parseMetricValue(existing?.revenue) ?? 0) + revenue,
      logos,
      sourceChannel: 'Lead Broker',
    });
  }

  return Array.from(byCloser.values());
}

function createSdrSourceRows(
  table: readonly (readonly string[])[],
  detailRows: readonly (readonly string[])[],
  columns: SheetColumnIndexes,
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  return createSdrRowsFromSummary(table, period).length > 0
    ? createSdrRowsFromSummary(table, period)
    : createSdrRowsFromDetails(detailRows, columns, period);
}

function createSdrRowsFromSummary(
  table: readonly (readonly string[])[],
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const happenedRowIndex = table.findIndex(
    (row) => normalizeKey(row[0]) === 'acontecidas',
  );

  if (happenedRowIndex <= 0) {
    return [];
  }

  const names = table[happenedRowIndex - 2] ?? [];
  const values = table[happenedRowIndex] ?? [];
  const rows: LocalRankingSourceRow[] = [];

  for (let index = 1; index < values.length; index += 1) {
    const sdr = resolveMember(names[index], KNOWN_SDRS);

    if (!sdr) {
      continue;
    }

    rows.push({
      period: period.end,
      role: 'sdr',
      memberId: sdr.id,
      memberName: sdr.name,
      meetingsHeld: parseMetricValue(values[index]) ?? 0,
      sourceChannel: 'Lead Broker',
    });
  }

  return rows;
}

function createSdrRowsFromDetails(
  rows: readonly (readonly string[])[],
  columns: SheetColumnIndexes,
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const bySdr = new Map<string, LocalRankingSourceRow>();

  for (const row of rows) {
    const sdr = resolveMember(row[columns.sdr], KNOWN_SDRS);
    const happenedAt = parseSheetDate(row[columns.happenedAt]);

    if (
      !sdr ||
      !happenedAt ||
      happenedAt < period.start ||
      happenedAt > period.end
    ) {
      continue;
    }

    const existing = bySdr.get(sdr.id);

    bySdr.set(sdr.id, {
      period: period.end,
      role: 'sdr',
      memberId: sdr.id,
      memberName: sdr.name,
      meetingsHeld: (parseMetricValue(existing?.meetingsHeld) ?? 0) + 1,
      sourceChannel: 'Lead Broker',
    });
  }

  return Array.from(bySdr.values());
}

function isClosedSale(
  row: readonly string[],
  columns: SheetColumnIndexes,
): boolean {
  return (
    normalizeKey(row[columns.status]).includes('fechado') ||
    row[columns.productSold]?.trim().length > 0
  );
}

function getColumnIndexes(headers: readonly string[]): SheetColumnIndexes {
  return {
    purchaseDate: findColumn(headers, 'data da compra'),
    status: findColumn(headers, 'status'),
    mrr: findColumn(headers, 'mrr'),
    closeDate: findColumn(headers, 'data de fechamento'),
    happenedAt: findColumn(headers, 'acontecida'),
    sdr: findColumn(headers, 'sdr'),
    closer: findColumn(headers, 'closer'),
    productSold: findColumn(headers, 'produto vendido'),
  };
}

function findColumn(headers: readonly string[], columnName: string): number {
  const index = headers.findIndex(
    (header) => normalizeKey(header) === columnName,
  );

  if (index < 0) {
    throw new Error(`Coluna obrigatória ausente: ${columnName}.`);
  }

  return index;
}

function detectPeriod(table: readonly (readonly string[])[]): PeriodFilter {
  const start = findLabeledDate(table, 'data inicio') ?? DEFAULT_PERIOD.start;
  const end = findLabeledDate(table, 'data fim') ?? DEFAULT_PERIOD.end;

  return {
    start,
    end,
    label: createPeriodLabel(start),
  };
}

function findLabeledDate(
  table: readonly (readonly string[])[],
  label: string,
): string | undefined {
  for (const row of table) {
    if (normalizeKey(row[0]) === label) {
      return parseSheetDate(row[1]) ?? undefined;
    }
  }

  return undefined;
}

function createPeriodLabel(date: string): string {
  const [year, month] = date.split('-');
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return `${monthNames[Number(month) - 1] ?? month}/${year}`;
}

function resolveMember(
  value: string | undefined,
  mappings: readonly MemberMapping[],
): MemberMapping | undefined {
  const key = normalizeKey(value);

  return mappings.find((member) =>
    member.aliases.some((alias) => normalizeKey(alias) === key),
  );
}

function parseSheetDate(value: string | undefined): string | null {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(rawValue);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeKey(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
