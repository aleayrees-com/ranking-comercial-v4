import type { RankingRole, RawRankingRow } from './ranking.js';

export interface LocalRankingSourceRow {
  readonly period: string;
  readonly role: RankingRole;
  readonly memberId?: string | null;
  readonly memberName: string;
  readonly revenue?: string | number | null;
  readonly logos?: string | number | null;
  readonly meetingsHeld?: string | number | null;
  readonly monthlyGoal?: string | number | null;
  readonly sourceChannel?: string | null;
}

export function parseMetricValue(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === 'number') {
    return value;
  }

  const rawValue = value?.trim();

  if (!rawValue || rawValue.toLowerCase() === 'sem venda') {
    return null;
  }

  const normalizedValue = rawValue
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function normalizeLocalRows(
  rows: readonly LocalRankingSourceRow[],
): readonly RawRankingRow[] {
  return rows.map((row) => ({
    period: row.period,
    role: row.role,
    memberId: row.memberId?.trim() || `${row.role}-${slugify(row.memberName)}`,
    memberName: row.memberName.trim(),
    revenue: parseMetricValue(row.revenue),
    logos: parseMetricValue(row.logos),
    meetingsHeld: parseMetricValue(row.meetingsHeld),
    ...(row.monthlyGoal === null || row.monthlyGoal === undefined
      ? {}
      : { monthlyGoal: parseMetricValue(row.monthlyGoal) }),
    sourceChannel: row.sourceChannel?.trim() || 'Não informado',
  }));
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
