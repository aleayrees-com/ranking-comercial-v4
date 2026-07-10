export type RankingRole = 'closer' | 'sdr';

export interface PeriodFilter {
  readonly start: string;
  readonly end: string;
  readonly label: string;
}

const RANKING_TIME_ZONE = 'America/Sao_Paulo';

export function getCurrentPeriodMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: RANKING_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now);
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  if (!month || !year) {
    throw new Error('Não foi possível determinar o mês vigente.');
  }

  return `${year}-${month}`;
}

export interface RawRankingRow {
  readonly period: string;
  readonly role: RankingRole;
  readonly memberId: string;
  readonly memberName: string;
  readonly revenue?: number | null;
  readonly logos?: number | null;
  readonly meetingsHeld?: number | null;
  readonly monthlyGoal?: number | null;
  readonly sourceChannel?: string;
}

export interface RankingEntry {
  readonly position: number;
  readonly role: RankingRole;
  readonly memberId: string;
  readonly memberName: string;
  readonly revenue: number;
  readonly logos: number;
  readonly meetingsHeld: number;
  readonly monthlyGoal: number | null;
  readonly sourceChannel: string;
}

export interface DataInconsistency {
  readonly memberId: string;
  readonly memberName: string;
  readonly field: keyof RawRankingRow;
  readonly message: string;
}

export interface RankingResult {
  readonly period: PeriodFilter;
  readonly closers: readonly RankingEntry[];
  readonly sdrs: readonly RankingEntry[];
  readonly inconsistencies: readonly DataInconsistency[];
  readonly totals: {
    readonly revenue: number;
    readonly logos: number;
    readonly meetingsHeld: number;
  };
  readonly isEmpty: boolean;
}

export function buildRanking(
  rows: readonly RawRankingRow[],
  period: PeriodFilter,
): RankingResult {
  const inPeriodRows = rows.filter((row) => isWithinPeriod(row.period, period));
  const inconsistencies: DataInconsistency[] = [];
  const validRows: RawRankingRow[] = [];

  for (const row of inPeriodRows) {
    const rowIssues = validateRow(row);

    if (rowIssues.length > 0) {
      inconsistencies.push(...rowIssues);
      continue;
    }

    validRows.push(row);
  }

  const closers = rankEntries(
    aggregateRows(validRows.filter((row) => row.role === 'closer')),
    compareCloserEntries,
  );
  const sdrs = rankEntries(
    aggregateRows(validRows.filter((row) => row.role === 'sdr')),
    compareSdrEntries,
  );

  return {
    period,
    closers,
    sdrs,
    inconsistencies,
    totals: {
      revenue: sum(closers, 'revenue'),
      logos: sum(closers, 'logos'),
      meetingsHeld: sum(sdrs, 'meetingsHeld'),
    },
    isEmpty: closers.length === 0 && sdrs.length === 0,
  };
}

function isWithinPeriod(date: string, period: PeriodFilter): boolean {
  return date >= period.start && date <= period.end;
}

function validateRow(row: RawRankingRow): readonly DataInconsistency[] {
  const issues: DataInconsistency[] = [];

  if (row.memberName.trim().length === 0) {
    issues.push(createIssue(row, 'memberName', 'Nome do integrante ausente.'));
  }

  if (row.role === 'closer') {
    issues.push(...validateMetric(row, 'revenue', row.revenue));
    issues.push(...validateMetric(row, 'logos', row.logos));
  }

  if (row.role === 'sdr') {
    issues.push(...validateMetric(row, 'meetingsHeld', row.meetingsHeld));
  }

  return issues;
}

function validateMetric(
  row: RawRankingRow,
  field: 'revenue' | 'logos' | 'meetingsHeld',
  value: number | null | undefined,
): readonly DataInconsistency[] {
  if (value === null || value === undefined) {
    return [createIssue(row, field, `Métrica obrigatória ausente: ${field}.`)];
  }

  if (value < 0) {
    return [createIssue(row, field, `Métrica negativa: ${field}.`)];
  }

  return [];
}

function createIssue(
  row: RawRankingRow,
  field: keyof RawRankingRow,
  message: string,
): DataInconsistency {
  return {
    memberId: row.memberId,
    memberName: row.memberName,
    field,
    message,
  };
}

function aggregateRows(
  rows: readonly RawRankingRow[],
): readonly RankingEntry[] {
  const entriesByMember = new Map<string, RankingEntry>();

  for (const row of rows) {
    const existing = entriesByMember.get(row.memberId);
    const sourceChannel = row.sourceChannel?.trim() || 'Não informado';

    if (!existing) {
      entriesByMember.set(row.memberId, {
        position: 0,
        role: row.role,
        memberId: row.memberId,
        memberName: row.memberName.trim(),
        revenue: row.revenue ?? 0,
        logos: row.logos ?? 0,
        meetingsHeld: row.meetingsHeld ?? 0,
        monthlyGoal: row.monthlyGoal ?? null,
        sourceChannel,
      });
      continue;
    }

    entriesByMember.set(row.memberId, {
      ...existing,
      revenue: existing.revenue + (row.revenue ?? 0),
      logos: existing.logos + (row.logos ?? 0),
      meetingsHeld: existing.meetingsHeld + (row.meetingsHeld ?? 0),
      monthlyGoal: mergeMonthlyGoals(existing.monthlyGoal, row.monthlyGoal),
      sourceChannel: mergeSourceChannels(existing.sourceChannel, sourceChannel),
    });
  }

  return Array.from(entriesByMember.values());
}

function mergeMonthlyGoals(
  current: number | null,
  next: number | null | undefined,
): number | null {
  if (next === null || next === undefined) {
    return current;
  }

  return current === null ? next : Math.max(current, next);
}

function mergeSourceChannels(current: string, next: string): string {
  if (current === next) {
    return current;
  }

  if (current === 'Múltiplos canais') {
    return current;
  }

  return 'Múltiplos canais';
}

function rankEntries(
  entries: readonly RankingEntry[],
  compare: (left: RankingEntry, right: RankingEntry) => number,
): readonly RankingEntry[] {
  return [...entries]
    .sort(compare)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

function compareCloserEntries(left: RankingEntry, right: RankingEntry): number {
  return (
    right.revenue - left.revenue ||
    right.logos - left.logos ||
    left.memberName.localeCompare(right.memberName, 'pt-BR') ||
    left.memberId.localeCompare(right.memberId, 'pt-BR')
  );
}

function compareSdrEntries(left: RankingEntry, right: RankingEntry): number {
  return (
    right.meetingsHeld - left.meetingsHeld ||
    left.memberName.localeCompare(right.memberName, 'pt-BR') ||
    left.memberId.localeCompare(right.memberId, 'pt-BR')
  );
}

function sum(
  entries: readonly RankingEntry[],
  field: 'revenue' | 'logos' | 'meetingsHeld',
): number {
  return entries.reduce((total, entry) => total + entry[field], 0);
}
