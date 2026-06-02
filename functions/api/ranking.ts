import {
  SOURCE_SPREADSHEET_ID,
  SOURCE_SPREADSHEET_TIMEZONE,
  SOURCE_SPREADSHEET_TITLE,
  parseGoogleSheetRankingCsv,
  type GoogleSheetSourceInfo,
  type SheetRankingData,
} from '../../src/domain/googleSheetSource.js';
import type { PeriodFilter, RawRankingRow } from '../../src/domain/ranking.js';

const GOOGLE_SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_SPREADSHEET_ID}/edit?usp=sharing`;
const FIRST_AUTOMATED_MONTH = '2026-01-01';
const SHEET_METADATA_PATTERN =
  /\[\d+,0,\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"((?:\\\\.|[^\\])*)\\"/g;
const MONTH_LABELS = [
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
  MONTH_LABELS.map((label, index) => [normalizeKey(label), index + 1]),
);

type CloudflareRequestInit = RequestInit & {
  readonly cf?: {
    readonly cacheTtl: number;
  };
};

export interface MonthlyCdrSheet extends GoogleSheetSourceInfo {
  readonly end: string;
  readonly label: string;
  readonly start: string;
}

interface MonthlySheetRankingResult {
  readonly payload: SheetRankingData;
  readonly sheet: MonthlyCdrSheet;
}

interface MonthlySheetRankings {
  readonly results: readonly MonthlySheetRankingResult[];
  readonly skippedSheets: readonly GoogleSheetSourceInfo[];
}

class RankingApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function onRequestGet(): Promise<Response> {
  try {
    const monthlySheets = await loadMonthlyCdrSheets();
    const sheetRankings = await loadMonthlySheetRankings(monthlySheets);

    if (sheetRankings.results.length === 0) {
      return jsonResponse(
        { message: 'Nenhuma aba mensal CDR pôde ser lida.' },
        502,
      );
    }

    const payload = combineMonthlySheetPayloads(sheetRankings);

    return jsonResponse({
      ...payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return jsonResponse(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao ler a planilha.',
      },
      error instanceof RankingApiError ? error.status : 500,
    );
  }
}

export function discoverMonthlyCdrSheets(
  html: string,
): readonly MonthlyCdrSheet[] {
  const byStart = new Map<string, MonthlyCdrSheet>();

  for (const match of html.matchAll(SHEET_METADATA_PATTERN)) {
    const [, gid, rawTitle] = match;
    const title = decodeSheetTitle(rawTitle);
    const monthlySheet = parseMonthlyCdrSheet({ gid, title });

    if (!monthlySheet || byStart.has(monthlySheet.start)) {
      continue;
    }

    byStart.set(monthlySheet.start, monthlySheet);
  }

  return Array.from(byStart.values()).sort((left, right) =>
    right.start.localeCompare(left.start),
  );
}

async function loadMonthlyCdrSheets(): Promise<readonly MonthlyCdrSheet[]> {
  const requestInit = createNoCacheRequestInit();
  const response = await fetch(
    `${GOOGLE_SHEET_EDIT_URL}&cachebust=${Date.now()}`,
    requestInit,
  );

  if (!response.ok) {
    throw new RankingApiError(
      `Falha ao descobrir abas mensais CDR: ${response.status}`,
      502,
    );
  }

  const sheets = discoverMonthlyCdrSheets(await response.text()).filter(
    (sheet) => sheet.start >= FIRST_AUTOMATED_MONTH,
  );

  if (sheets.length === 0) {
    throw new RankingApiError('Nenhuma aba mensal CDR encontrada.', 502);
  }

  return sheets;
}

async function loadMonthlySheetRanking(
  sheet: MonthlyCdrSheet,
): Promise<MonthlySheetRankingResult> {
  const response = await fetch(
    `${createCsvUrl(sheet.gid)}&cachebust=${Date.now()}`,
    createNoCacheRequestInit(),
  );

  if (!response.ok) {
    throw new Error(`Falha ao ler planilha ${sheet.title}: ${response.status}`);
  }

  return {
    payload: parseGoogleSheetRankingCsv(await response.text(), sheet),
    sheet,
  };
}

async function loadMonthlySheetRankings(
  sheets: readonly MonthlyCdrSheet[],
): Promise<MonthlySheetRankings> {
  const results = await Promise.allSettled(
    sheets.map((sheet) => loadMonthlySheetRanking(sheet)),
  );

  const latestResult = results[0];
  const latestSheet = sheets[0];

  if (latestResult?.status === 'rejected' && latestSheet) {
    throw new RankingApiError(
      `Falha ao ler a aba mensal mais recente ${latestSheet.title}: ${getErrorMessage(latestResult.reason)}`,
      502,
    );
  }

  return {
    results: results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    ),
    skippedSheets: results.flatMap((result, index) =>
      result.status === 'rejected' && sheets[index] ? [sheets[index]] : [],
    ),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido';
}

function combineMonthlySheetPayloads({
  results,
  skippedSheets,
}: MonthlySheetRankings): {
  readonly isPartial: boolean;
  readonly loadedSheets: readonly string[];
  readonly periodFilters: readonly PeriodFilter[];
  readonly periods: readonly PeriodFilter[];
  readonly rows: readonly RawRankingRow[];
  readonly skippedSheets: readonly string[];
  readonly sourceSpreadsheet: SheetRankingData['sourceSpreadsheet'];
} {
  const sheets = results.map((result) => result.sheet);
  const payloads = results.map((result) => result.payload);
  const periodFilters = sortPeriodsDescending(
    uniquePeriods(payloads.flatMap((payload) => payload.periods)),
  );
  const rows = payloads.flatMap((payload) => payload.rows);
  const latestSheet = sheets[0];

  if (!latestSheet) {
    throw new RankingApiError('Nenhuma aba mensal CDR pôde ser lida.', 502);
  }

  return {
    isPartial: skippedSheets.length > 0,
    loadedSheets: sheets.map((sheet) => sheet.title),
    periodFilters,
    periods: periodFilters,
    rows,
    skippedSheets: skippedSheets.map((sheet) => sheet.title),
    sourceSpreadsheet: {
      title: SOURCE_SPREADSHEET_TITLE,
      url: `https://docs.google.com/spreadsheets/d/${SOURCE_SPREADSHEET_ID}/edit?gid=${latestSheet.gid}#gid=${latestSheet.gid}`,
      sheet: createCombinedSheetLabel(sheets, skippedSheets),
      timezone: SOURCE_SPREADSHEET_TIMEZONE,
    },
  };
}

function uniquePeriods(
  periods: readonly PeriodFilter[],
): readonly PeriodFilter[] {
  const byMonth = new Map<string, PeriodFilter>();

  for (const period of periods) {
    byMonth.set(period.start.slice(0, 7), period);
  }

  return Array.from(byMonth.values());
}

function sortPeriodsDescending(
  periods: readonly PeriodFilter[],
): readonly PeriodFilter[] {
  return [...periods].sort((left, right) =>
    right.start.localeCompare(left.start),
  );
}

function createCombinedSheetLabel(
  sheets: readonly MonthlyCdrSheet[],
  skippedSheets: readonly GoogleSheetSourceInfo[],
): string {
  const latestSheet = sheets[0];

  if (!latestSheet) {
    throw new RankingApiError('Nenhuma aba mensal CDR pôde ser lida.', 502);
  }

  if (skippedSheets.length > 0) {
    const loadedPreviousSheets = Math.max(0, sheets.length - 1);

    return `${latestSheet.title} + ${loadedPreviousSheets} ${
      loadedPreviousSheets === 1 ? 'aba carregada' : 'abas carregadas'
    } (parcial)`;
  }

  const previousMonths = Math.max(0, sheets.length - 1);

  if (previousMonths === 0) {
    return latestSheet.title;
  }

  return `${latestSheet.title} + ${previousMonths} ${
    previousMonths === 1 ? 'mês anterior' : 'meses anteriores'
  }`;
}

function parseMonthlyCdrSheet(
  sourceSheet: GoogleSheetSourceInfo,
): MonthlyCdrSheet | null {
  const title = sourceSheet.title.trim();

  if (/^c[oó]pia\s+de\s+/i.test(title)) {
    return null;
  }

  const match = /^CDR\s+(.+?)\/(\d{2}|\d{4})$/i.exec(title);

  if (!match) {
    return null;
  }

  const [, monthText, yearText] = match;
  const month = MONTH_INDEX_BY_KEY.get(normalizeKey(monthText));

  if (!month) {
    return null;
  }

  const year =
    yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(
    new Date(year, month, 0).getDate(),
  ).padStart(2, '0')}`;

  return {
    ...sourceSheet,
    end,
    label: `${MONTH_LABELS[month - 1]}/${year}`,
    start,
  };
}

function decodeSheetTitle(value: string): string {
  return value
    .replace(/\\u([\dA-Fa-f]{4})/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function createCsvUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${SOURCE_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

function createNoCacheRequestInit(): CloudflareRequestInit {
  return {
    cf: {
      cacheTtl: 0,
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json; charset=utf-8',
    },
    status,
  });
}

function normalizeKey(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
