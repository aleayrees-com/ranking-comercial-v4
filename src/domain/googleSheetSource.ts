import {
  normalizeLocalRows,
  parseMetricValue,
  type LocalRankingSourceRow,
} from './normalization.js';
import type { PeriodFilter, RawRankingRow } from './ranking.js';

export interface SheetRankingData {
  readonly periods: readonly PeriodFilter[];
  readonly rows: readonly RawRankingRow[];
  readonly sourceSpreadsheet: {
    readonly title: string;
    readonly url: string;
    readonly sheet: string;
    readonly timezone: string;
  };
}

export interface GoogleSheetSourceInfo {
  readonly gid: string;
  readonly title: string;
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

export const SOURCE_SPREADSHEET_ID =
  '1iqFf2dbfsG_tl2FB8TrPsBfjO3xkvQYrnvqheUPY9KE';
export const SOURCE_SPREADSHEET_TITLE =
  'Controle de Resultados | Alfradique & Co RJ';
export const SOURCE_SPREADSHEET_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_SOURCE_SHEET: GoogleSheetSourceInfo = {
  gid: '1481288268',
  title: 'CDR MAIO/26',
};

const DEFAULT_PERIOD: PeriodFilter = {
  label: 'Maio/2026',
  start: '2026-05-01',
  end: '2026-05-31',
};
const MONTH_NAMES = [
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
] as const;
const MONTH_INDEX_BY_KEY = new Map(
  MONTH_NAMES.map((label, index) => [normalizeKey(label), index + 1]),
);

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
  {
    id: 'gisela-emanuella-candido-costa-silva',
    name: 'Emanuella',
    aliases: ['Emanuella', 'Gisela Emanuella Candido Costa Silva'],
  },
  {
    id: 'pedro-paulo-dias-da-fonseca',
    name: 'Pedro Paulo',
    aliases: ['Pedro Paulo', 'Pedro Paulo Dias da Fonseca'],
  },
  {
    id: 'matheus-caruzo-monteiro-goncalves',
    name: 'Matheus Caruzo',
    aliases: ['Matheus Caruzo', 'Matheus Caruzo Monteiro Gonçalves'],
  },
];

const IGNORED_CLOSER_KEYS = new Set(['bruno alfradique', 'bruno']);

export function parseGoogleSheetRankingCsv(
  csv: string,
  sourceSheet: GoogleSheetSourceInfo = DEFAULT_SOURCE_SHEET,
): SheetRankingData {
  const table = parseCsv(csv);
  const period = detectPeriod(table, sourceSheet);
  const cdrSourceRows = createCdrSourceRows(table, period);

  if (cdrSourceRows.length > 0) {
    return {
      periods: [period],
      rows: normalizeLocalRows(cdrSourceRows),
      sourceSpreadsheet: createSourceSpreadsheet(sourceSheet),
    };
  }

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
    sourceSpreadsheet: createSourceSpreadsheet(sourceSheet),
  };
}

function createSourceSpreadsheet(sourceSheet: GoogleSheetSourceInfo) {
  return {
    title: SOURCE_SPREADSHEET_TITLE,
    url: `https://docs.google.com/spreadsheets/d/${SOURCE_SPREADSHEET_ID}/edit?gid=${sourceSheet.gid}#gid=${sourceSheet.gid}`,
    sheet: sourceSheet.title,
    timezone: SOURCE_SPREADSHEET_TIMEZONE,
  };
}

function createCdrSourceRows(
  table: readonly (readonly string[])[],
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const closerRows = createCloserRowsFromCdrSummary(table, period);
  const sdrRows = createSdrRowsFromCdrSummary(table, period);

  return [...closerRows, ...sdrRows];
}

function createCloserRowsFromCdrSummary(
  table: readonly (readonly string[])[],
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const section = findSummarySection(table, KNOWN_CLOSERS, 2);

  if (!section) {
    return [];
  }

  const revenueRow = findSummaryMetricRow(table, section, 'realizado');
  const logosRow = findSummaryMetricRow(table, section, 'vendas');

  if (!revenueRow || !logosRow) {
    return [];
  }

  return section.members.map(({ column, member }) => ({
    period: period.end,
    role: 'closer',
    memberId: member.id,
    memberName: member.name,
    revenue: parseMetricValue(revenueRow[column]) ?? 0,
    logos: parseMetricValue(logosRow[column]) ?? 0,
    sourceChannel: 'Lead Broker',
  }));
}

function createSdrRowsFromCdrSummary(
  table: readonly (readonly string[])[],
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  const section = findSummarySection(table, KNOWN_SDRS, 2);

  if (!section) {
    return [];
  }

  const meetingsRow = findSummaryMetricRow(table, section, 'realizado');

  if (!meetingsRow) {
    return [];
  }

  return section.members.flatMap(({ column, member }) => {
    const meetingsHeld = parseMetricValue(meetingsRow[column]) ?? 0;

    if (!shouldIncludeSdrSummaryMember(member, meetingsHeld, period)) {
      return [];
    }

    const sourceRow: LocalRankingSourceRow = {
      period: period.end,
      role: 'sdr',
      memberId: member.id,
      memberName: member.name,
      meetingsHeld,
      sourceChannel: 'Lead Broker',
    };

    return [sourceRow];
  });
}

function shouldIncludeSdrSummaryMember(
  member: MemberMapping,
  meetingsHeld: number,
  period: PeriodFilter,
): boolean {
  return !(
    member.id === 'lucas-macedo' &&
    meetingsHeld === 0 &&
    period.start >= '2026-06-01'
  );
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

interface SummarySection {
  readonly headerRowIndex: number;
  readonly labelColumn: number;
  readonly members: readonly SummaryMember[];
}

interface SummaryMember {
  readonly column: number;
  readonly member: MemberMapping;
}

function findSummarySection(
  table: readonly (readonly string[])[],
  mappings: readonly MemberMapping[],
  minimumMembers: number,
): SummarySection | undefined {
  for (const [rowIndex, row] of table.entries()) {
    for (const [columnIndex, cell] of row.entries()) {
      if (normalizeKey(cell) !== 'meta') {
        continue;
      }

      const members = collectSummaryMembers(row, columnIndex + 1, mappings);

      if (members.length >= minimumMembers) {
        return {
          headerRowIndex: rowIndex,
          labelColumn: columnIndex,
          members,
        };
      }
    }
  }

  return undefined;
}

function collectSummaryMembers(
  row: readonly string[],
  startColumn: number,
  mappings: readonly MemberMapping[],
): SummarySection['members'] {
  const members: SummaryMember[] = [];

  for (let column = startColumn; column < row.length; column += 1) {
    const cell = row[column];

    if (normalizeKey(cell) === 'total' || normalizeKey(cell) === 'total time') {
      break;
    }

    const member = resolveMember(cell, mappings);

    if (member) {
      members.push({ column, member });
    }
  }

  return members;
}

function findSummaryMetricRow(
  table: readonly (readonly string[])[],
  section: SummarySection,
  metricLabel: string,
): readonly string[] | undefined {
  const normalizedMetricLabel = normalizeKey(metricLabel);

  return table
    .slice(section.headerRowIndex + 1)
    .find(
      (row) => normalizeKey(row[section.labelColumn]) === normalizedMetricLabel,
    );
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
    const meetingsHeld = parseMetricValue(values[index]) ?? 0;

    if (!sdr || !shouldIncludeSdrSummaryMember(sdr, meetingsHeld, period)) {
      continue;
    }

    rows.push({
      period: period.end,
      role: 'sdr',
      memberId: sdr.id,
      memberName: sdr.name,
      meetingsHeld,
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

function detectPeriod(
  table: readonly (readonly string[])[],
  sourceSheet: GoogleSheetSourceInfo,
): PeriodFilter {
  const sourcePeriod = createPeriodFromSourceSheetTitle(sourceSheet.title);
  const start =
    findLabeledDate(table, 'data inicio') ??
    sourcePeriod?.start ??
    DEFAULT_PERIOD.start;
  const end =
    findLabeledDate(table, 'data fim') ??
    sourcePeriod?.end ??
    createMonthPeriodFromStart(start).end;

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
    if (normalizeLabel(row[0]) === label) {
      return parseSheetDate(row[1]) ?? undefined;
    }
  }

  return undefined;
}

function normalizeLabel(value: string | undefined): string {
  return normalizeKey(value).replace(/:+$/, '');
}

function createPeriodLabel(date: string): string {
  const [year, month] = date.split('-');

  return `${MONTH_NAMES[Number(month) - 1] ?? month}/${year}`;
}

function createPeriodFromSourceSheetTitle(title: string): PeriodFilter | null {
  const match = /^CDR\s+(.+?)\/(\d{2}|\d{4})$/i.exec(title.trim());

  if (!match) {
    return null;
  }

  const [, monthText, yearText] = match;
  const month = MONTH_INDEX_BY_KEY.get(normalizeKey(monthText));
  const year =
    yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);

  if (!month || !Number.isFinite(year)) {
    return null;
  }

  return createMonthPeriod(year, month);
}

function createMonthPeriod(year: number, month: number): PeriodFilter {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(
    new Date(year, month, 0).getDate(),
  ).padStart(2, '0')}`;

  return {
    end,
    label: createPeriodLabel(start),
    start,
  };
}

function createMonthPeriodFromStart(start: string): PeriodFilter {
  const [yearText, monthText] = start.split('-');

  return createMonthPeriod(Number(yearText), Number(monthText));
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
