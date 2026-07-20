import type { RankingRole } from './ranking.js';

export interface PodiumPlacement {
  readonly memberId: string;
  readonly position: number;
}

export interface PodiumTenureRecord extends PodiumPlacement {
  readonly startedOn: string;
}

const RANKING_TIME_ZONE = 'America/Sao_Paulo';
const MILLISECONDS_PER_DAY = 86_400_000;

const JULY_2026_INITIAL_PODIUM: readonly (PodiumTenureRecord & {
  readonly kind: RankingRole;
})[] = [
  {
    kind: 'closer',
    memberId: 'carlos-guerra',
    position: 1,
    startedOn: '2026-07-01',
  },
  {
    kind: 'closer',
    memberId: 'bruno-alfradique',
    position: 2,
    startedOn: '2026-07-01',
  },
  {
    kind: 'closer',
    memberId: 'lucas-macedo',
    position: 3,
    startedOn: '2026-07-01',
  },
  {
    kind: 'closer',
    memberId: 'miguel-de-oliveira-guimaraes-vieira',
    position: 4,
    startedOn: '2026-07-01',
  },
  {
    kind: 'sdr',
    memberId: 'gisela-emanuella-candido-costa-silva',
    position: 1,
    startedOn: '2026-07-01',
  },
  {
    kind: 'sdr',
    memberId: 'joao-carlos-de-oliveira-costa',
    position: 2,
    startedOn: '2026-07-01',
  },
  {
    kind: 'sdr',
    memberId: 'matheus-caruzo-monteiro-goncalves',
    position: 3,
    startedOn: '2026-07-01',
  },
  {
    kind: 'sdr',
    memberId: 'daniel-dias-do-nascimento',
    position: 4,
    startedOn: '2026-07-01',
  },
  {
    kind: 'sdr',
    memberId: 'sdr-paula-oliveira',
    position: 5,
    startedOn: '2026-07-01',
  },
];

export function getPodiumToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: RANKING_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  if (!day || !month || !year) {
    throw new Error('Não foi possível determinar a data do ranking.');
  }

  return `${year}-${month}-${day}`;
}

export function getPodiumTenureStorageKey(
  periodMonth: string,
  kind: RankingRole,
): string {
  return `ranking-podium-tenure-v1:${periodMonth}:${kind}`;
}

export function parsePodiumTenureRecords(
  serializedRecords: string | null,
): readonly PodiumTenureRecord[] {
  if (!serializedRecords) {
    return [];
  }

  try {
    const parsedRecords: unknown = JSON.parse(serializedRecords);

    if (!Array.isArray(parsedRecords)) {
      return [];
    }

    return parsedRecords.filter(isPodiumTenureRecord);
  } catch {
    return [];
  }
}

export function reconcilePodiumTenures(
  placements: readonly PodiumPlacement[],
  previousRecords: readonly PodiumTenureRecord[],
  periodMonth: string,
  kind: RankingRole,
  today: string,
): readonly PodiumTenureRecord[] {
  const previousByPosition = new Map(
    previousRecords.map((record) => [record.position, record]),
  );

  return placements.map((placement) => {
    const previousRecord = previousByPosition.get(placement.position);

    if (
      previousRecord?.memberId === placement.memberId &&
      previousRecord.startedOn <= today
    ) {
      return previousRecord;
    }

    const seededRecord = JULY_2026_INITIAL_PODIUM.find(
      (record) =>
        periodMonth === '2026-07' &&
        record.kind === kind &&
        record.position === placement.position &&
        record.memberId === placement.memberId,
    );

    return {
      ...placement,
      startedOn: seededRecord?.startedOn ?? today,
    };
  });
}

export function formatPodiumTenure(
  record: PodiumTenureRecord,
  today: string,
): string {
  const days = getInclusiveDayCount(record.startedOn, today);

  return `${days} ${days === 1 ? 'dia' : 'dias'} no ${record.position}º lugar`;
}

function getInclusiveDayCount(startedOn: string, today: string): number {
  const startedAt = parseDate(startedOn);
  const currentDate = parseDate(today);

  if (startedAt === null || currentDate === null) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor((currentDate - startedAt) / MILLISECONDS_PER_DAY) + 1,
  );
}

function parseDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(timestamp) ? null : timestamp;
}

function isPodiumTenureRecord(value: unknown): value is PodiumTenureRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.memberId === 'string' &&
    value.memberId.length > 0 &&
    typeof value.position === 'number' &&
    Number.isInteger(value.position) &&
    value.position >= 1 &&
    value.position <= 5 &&
    typeof value.startedOn === 'string' &&
    parseDate(value.startedOn) !== null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
