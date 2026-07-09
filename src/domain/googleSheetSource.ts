import {
  normalizeLocalRows,
  parseMetricValue,
  type LocalRankingSourceRow,
} from './normalization.js';
import { investorProfiles } from '../data/investorProfiles.js';
import { findInvestorProfile } from './investors.js';
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

interface SheetMember {
  readonly id?: string;
  readonly name: string;
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

const IGNORED_CLOSER_KEYS = new Set(['bruno alfradique', 'bruno']);
const SUMMARY_STOP_KEYS = new Set(['total', 'total time']);

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
  for (const section of findSummarySections(table, 1)) {
    const revenueRow = findSummaryMetricRow(table, section, 'realizado');
    const logosRow = findSummaryMetricRow(table, section, 'vendas');

    if (!revenueRow || !logosRow) {
      continue;
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

  return [];
}

function createSdrRowsFromCdrSummary(
  table: readonly (readonly string[])[],
  period: PeriodFilter,
): readonly LocalRankingSourceRow[] {
  for (const section of findSummarySections(table, 1)) {
    const meetingsRow = findSummaryMetricRow(table, section, 'realizado');
    const salesRow = findSummaryMetricRow(table, section, 'vendas');

    if (!meetingsRow || salesRow) {
      continue;
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

  return [];
}

function shouldIncludeSdrSummaryMember(
  member: SheetMember,
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

  for (const row of rows) {
    const closer = createSheetMember(row[columns.closer]);

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

    const closerKey = getMemberMapKey('closer', closer);
    const existing = byCloser.get(closerKey);
    const revenue = parseMetricValue(row[columns.mrr]) ?? 0;
    const logos = (parseMetricValue(existing?.logos) ?? 0) + 1;

    byCloser.set(closerKey, {
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
  readonly member: SheetMember;
}

function findSummarySections(
  table: readonly (readonly string[])[],
  minimumMembers: number,
): readonly SummarySection[] {
  const sections: SummarySection[] = [];

  for (const [rowIndex, row] of table.entries()) {
    for (const [columnIndex, cell] of row.entries()) {
      if (normalizeKey(cell) !== 'meta') {
        continue;
      }

      const members = collectSummaryMembers(row, columnIndex + 1);

      if (members.length >= minimumMembers) {
        sections.push({
          headerRowIndex: rowIndex,
          labelColumn: columnIndex,
          members,
        });
      }
    }
  }

  return sections;
}

function collectSummaryMembers(
  row: readonly string[],
  startColumn: number,
): SummarySection['members'] {
  const members: SummaryMember[] = [];

  for (let column = startColumn; column < row.length; column += 1) {
    const cell = row[column];

    if (SUMMARY_STOP_KEYS.has(normalizeKey(cell))) {
      break;
    }

    const member = createSheetMember(cell);

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
  const summaryRows = createSdrRowsFromSummary(table, period);

  return summaryRows.length > 0
    ? summaryRows
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
    const sdr = createSheetMember(names[index]);
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
    const sdr = createSheetMember(row[columns.sdr]);
    const happenedAt = parseSheetDate(row[columns.happenedAt]);

    if (
      !sdr ||
      !happenedAt ||
      happenedAt < period.start ||
      happenedAt > period.end
    ) {
      continue;
    }

    const sdrKey = getMemberMapKey('sdr', sdr);
    const existing = bySdr.get(sdrKey);

    bySdr.set(sdrKey, {
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

function createSheetMember(value: string | undefined): SheetMember | undefined {
  const name = normalizeMemberName(value);

  if (!name || isIgnoredMemberLabel(name)) {
    return undefined;
  }

  const profile = findInvestorProfile(investorProfiles, name);

  return {
    id: profile?.id,
    name,
  };
}

function normalizeMemberName(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function isIgnoredMemberLabel(value: string): boolean {
  const key = normalizeKey(value);

  return (
    !/[a-z0-9]/.test(key) ||
    /^xpto(?:\s+\d+)?$/.test(key) ||
    SUMMARY_STOP_KEYS.has(key)
  );
}

function getMemberMapKey(role: 'closer' | 'sdr', member: SheetMember): string {
  return member.id ?? `${role}:${normalizeKey(member.name)}`;
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
