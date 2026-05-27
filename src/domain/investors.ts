export type InvestorStatus = 'active' | 'watch' | 'inactive';

export interface InvestorProfile {
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly roleLabel?: string;
  readonly imagePath?: string;
  readonly status: InvestorStatus;
  readonly ownerName?: string;
  readonly primaryMetricLabel?: string;
  readonly primaryMetricValue?: string;
  readonly updatedAtLabel?: string;
}

const ignoredInitialWords = new Set([
  'da',
  'de',
  'di',
  'do',
  'dos',
  'das',
  'e',
]);

export function findInvestorProfile(
  profiles: readonly InvestorProfile[],
  memberName: string,
): InvestorProfile | undefined {
  const normalizedMemberName = normalizeInvestorName(memberName);

  if (!normalizedMemberName) {
    return undefined;
  }

  return profiles.find((profile) => {
    const names = [profile.name, ...(profile.aliases ?? [])];

    return names.some(
      (name) => normalizeInvestorName(name) === normalizedMemberName,
    );
  });
}

export function getInvestorInitials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
    .filter((word) => word && !ignoredInitialWords.has(word.toLowerCase()));

  if (words.length === 0) {
    return 'IV';
  }

  const first = words[0]?.[0] ?? 'I';
  const last = words.length > 1 ? words[words.length - 1]?.[0] : words[0]?.[1];

  return `${first}${last ?? 'V'}`;
}

function normalizeInvestorName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}
