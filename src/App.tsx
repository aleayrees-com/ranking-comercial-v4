import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Crown,
  FileWarning,
  LoaderCircle,
  Maximize2,
  Medal,
  Trophy,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { investorProfiles } from './data/investorProfiles.js';
import {
  findInvestorProfile,
  getInvestorInitials,
  type InvestorProfile,
} from './domain/investors.js';
import {
  buildRanking,
  type PeriodFilter,
  type RankingEntry,
  type RankingResult,
  type RawRankingRow,
} from './domain/ranking.js';

interface AppProps {
  readonly initialInvestors?: readonly InvestorProfile[];
  readonly initialRows?: readonly RawRankingRow[];
  readonly initialPeriods?: readonly PeriodFilter[];
  readonly initialError?: string;
}

interface RankingFixtureModule {
  readonly rankingRows?: unknown;
  readonly rows?: unknown;
  readonly periodFilters?: unknown;
  readonly periods?: unknown;
  readonly sourceSpreadsheet?: unknown;
}

interface ImportMetaWithGlob extends ImportMeta {
  glob<TModule>(pattern: string): Record<string, () => Promise<TModule>>;
}

interface SourceInfo {
  readonly title: string;
  readonly sheet?: string;
}

type RankingDataState =
  | {
      readonly status: 'loading';
    }
  | {
      readonly status: 'error';
      readonly message: string;
    }
  | {
      readonly status: 'ready';
      readonly periods: readonly PeriodFilter[];
      readonly rows: readonly RawRankingRow[];
      readonly sourceInfo?: SourceInfo;
    };

type RankingKind = 'closer' | 'sdr';

type PodiumItemStyle = CSSProperties & {
  readonly '--podium-fill': string;
  readonly '--podium-height': string;
};

const DEFAULT_PERIODS: readonly PeriodFilter[] = [
  {
    start: '2026-05-01',
    end: '2026-05-31',
    label: 'Maio/2026',
  },
];

const fixtureModules = (
  import.meta as ImportMetaWithGlob
).glob<RankingFixtureModule>('./data/rankingFixture.ts');

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 0,
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

const monthLabels = [
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

export function App({
  initialError,
  initialInvestors,
  initialPeriods,
  initialRows,
}: AppProps) {
  const [dataState, setDataState] = useState<RankingDataState>(() => {
    if (initialError) {
      return {
        status: 'error',
        message: initialError,
      };
    }

    if (initialRows) {
      return createReadyState({
        periods: initialPeriods,
        rows: initialRows,
      });
    }

    return {
      status: 'loading',
    };
  });

  const periods =
    dataState.status === 'ready' ? dataState.periods : DEFAULT_PERIODS;
  const investors = initialInvestors ?? investorProfiles;

  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() =>
    getPeriodKey(periods[0] ?? DEFAULT_PERIODS[0]),
  );
  const [expandedPanelKind, setExpandedPanelKind] =
    useState<RankingKind | null>(null);

  const selectedPeriod =
    periods.find((period) => getPeriodKey(period) === selectedPeriodKey) ??
    periods[0] ??
    DEFAULT_PERIODS[0];

  const ranking = useMemo<RankingResult | null>(() => {
    if (dataState.status !== 'ready') {
      return null;
    }

    return buildRanking(dataState.rows, selectedPeriod);
  }, [dataState, selectedPeriod]);

  useEffect(() => {
    if (initialRows || initialError) {
      return;
    }

    let isActive = true;

    loadRankingFixture()
      .then((nextState) => {
        if (isActive) {
          setDataState(nextState);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setDataState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a fixture local.',
        });
      });

    return () => {
      isActive = false;
    };
  }, [initialError, initialRows]);

  useEffect(() => {
    if (!periods.some((period) => getPeriodKey(period) === selectedPeriodKey)) {
      setSelectedPeriodKey(getPeriodKey(periods[0] ?? DEFAULT_PERIODS[0]));
    }
  }, [periods, selectedPeriodKey]);

  useEffect(() => {
    if (!expandedPanelKind) {
      return;
    }

    document.body.classList.add('has-expanded-ranking');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedPanelKind(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('has-expanded-ranking');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedPanelKind]);

  return (
    <main className="app-shell">
      <section className="dashboard-header" aria-labelledby="dashboard-title">
        <div className="title-block">
          <div className="brand-lockup">
            <img src="/v4logo.png" alt="V4 Company" />
            <span>Receita</span>
          </div>
          <p className="eyebrow">Coordenação de Receita</p>
          <h1 id="dashboard-title">Ranking de Closer e SDR</h1>
          <p className="header-copy">
            Visão operacional por período, com pódio dos três primeiros, ranking
            completo e leitura rápida para tomada de decisão.
          </p>
        </div>

        <div className="period-control" aria-labelledby="period-control-label">
          <span className="period-label" id="period-control-label">
            Período
          </span>
          <div
            className="period-toggle-group"
            role="group"
            aria-labelledby="period-control-label"
          >
            {periods.map((period) => {
              const periodKey = getPeriodKey(period);
              const isSelected = periodKey === getPeriodKey(selectedPeriod);

              return (
                <button
                  aria-pressed={isSelected}
                  className={
                    isSelected ? 'period-toggle is-selected' : 'period-toggle'
                  }
                  key={periodKey}
                  onClick={() => setSelectedPeriodKey(periodKey)}
                  type="button"
                >
                  <CalendarDays aria-hidden="true" size={16} />
                  <span>{period.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {dataState.status === 'loading' ? (
        <StateCard
          body="Lendo a fixture local e preparando o cálculo do período."
          icon={LoaderCircle}
          tone="neutral"
          title="Carregando ranking"
        />
      ) : null}

      {dataState.status === 'error' ? (
        <StateCard
          body={dataState.message}
          icon={FileWarning}
          tone="danger"
          title="Erro ao carregar a fonte local"
        />
      ) : null}

      {dataState.status === 'ready' && ranking ? (
        <>
          <DashboardSummary
            ranking={ranking}
            sourceInfo={dataState.sourceInfo}
          />

          {ranking.isEmpty ? (
            <StateCard
              body="Não há linhas válidas para este período. Verifique se a fixture possui dados normalizados ou se todas as linhas foram rejeitadas por inconsistência."
              icon={FileWarning}
              tone="warning"
              title="Período sem ranking válido"
            />
          ) : null}

          <div className="ranking-grid">
            <RankingPanel
              expanded={expandedPanelKind === 'closer'}
              entries={ranking.closers}
              emptyLabel="Sem closers válidos"
              investors={investors}
              kind="closer"
              onClose={() => setExpandedPanelKind(null)}
              onExpand={() => setExpandedPanelKind('closer')}
              title="Closers"
            />
            <RankingPanel
              expanded={expandedPanelKind === 'sdr'}
              entries={ranking.sdrs}
              emptyLabel="Sem SDRs válidos"
              investors={investors}
              kind="sdr"
              onClose={() => setExpandedPanelKind(null)}
              onExpand={() => setExpandedPanelKind('sdr')}
              title="SDR / Pré-vendas"
            />
          </div>
        </>
      ) : null}
    </main>
  );
}

function DashboardSummary({
  ranking,
  sourceInfo,
}: {
  readonly ranking: RankingResult;
  readonly sourceInfo?: SourceInfo;
}) {
  return (
    <section className="summary-section" aria-labelledby="summary-title">
      <div className="summary-heading">
        <div>
          <p className="eyebrow">Resumo do período</p>
          <h2 id="summary-title">{ranking.period.label}</h2>
        </div>
        {sourceInfo ? (
          <p className="source-note">
            Fonte: {sourceInfo.title}
            {sourceInfo.sheet ? ` · ${sourceInfo.sheet}` : ''}
          </p>
        ) : null}
      </div>

      <div className="metric-grid">
        <MetricCard
          icon={CircleDollarSign}
          label="Receita realizada"
          value={formatCurrency(ranking.totals.revenue)}
        />
        <MetricCard
          icon={Trophy}
          label="Logos fechados"
          value={formatNumber(ranking.totals.logos)}
        />
        <MetricCard
          icon={UsersRound}
          label="Reuniões realizadas"
          value={formatNumber(ranking.totals.meetingsHeld)}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Inconsistências"
          value={formatNumber(ranking.inconsistencies.length)}
          warning={ranking.inconsistencies.length > 0}
        />
      </div>
    </section>
  );
}

function InvestorImage({
  investor,
  variant,
}: {
  readonly investor: InvestorProfile;
  readonly variant: 'member';
}) {
  const className = `investor-image investor-image--${variant}`;

  if (!investor.imagePath) {
    return (
      <span className={className} aria-label={`Iniciais de ${investor.name}`}>
        {getInvestorInitials(investor.name)}
      </span>
    );
  }

  return (
    <img alt="" className={className} loading="lazy" src={investor.imagePath} />
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly warning?: boolean;
}) {
  return (
    <article className={warning ? 'metric-card is-warning' : 'metric-card'}>
      <div className="metric-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function RankingPanel({
  emptyLabel,
  expanded,
  entries,
  investors,
  kind,
  onClose,
  onExpand,
  title,
}: {
  readonly emptyLabel: string;
  readonly expanded: boolean;
  readonly entries: readonly RankingEntry[];
  readonly investors: readonly InvestorProfile[];
  readonly kind: RankingKind;
  readonly onClose: () => void;
  readonly onExpand: () => void;
  readonly title: string;
}) {
  const topEntries = entries.slice(0, 3);
  const firstMemberId = topEntries[0]?.memberId ?? null;
  const topEntryIds = topEntries.map((entry) => entry.memberId).join('|');
  const [activeMemberId, setActiveMemberId] = useState<string | null>(
    firstMemberId,
  );
  const activeId = activeMemberId ?? firstMemberId;
  const maxMetricValue = Math.max(
    0,
    ...topEntries.map((entry) => getRankingMetricValue(entry, kind)),
  );

  useEffect(() => {
    if (!topEntries.some((entry) => entry.memberId === activeMemberId)) {
      setActiveMemberId(firstMemberId);
    }
  }, [activeMemberId, firstMemberId, topEntries, topEntryIds]);

  const handlePanelClick = (event: MouseEvent<HTMLElement>) => {
    if (expanded) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('button, a, table, .table-scroll')) {
      return;
    }

    onExpand();
  };

  return (
    <section
      aria-labelledby={`${kind}-title`}
      aria-modal={expanded ? true : undefined}
      className={expanded ? 'ranking-panel is-expanded' : 'ranking-panel'}
      onClick={handlePanelClick}
      role={expanded ? 'dialog' : undefined}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{kind === 'closer' ? 'Receita' : 'Agenda'}</p>
          <h2 id={`${kind}-title`}>{title}</h2>
        </div>
        <div className="panel-actions">
          <span className="panel-count">{entries.length} integrantes</span>
          <button
            aria-label={
              expanded ? `Fechar pódio ${title}` : `Expandir pódio ${title}`
            }
            className="panel-expand-button"
            onClick={expanded ? onClose : onExpand}
            title={expanded ? 'Fechar pódio' : 'Expandir pódio'}
            type="button"
          >
            {expanded ? (
              <X aria-hidden="true" size={18} />
            ) : (
              <Maximize2 aria-hidden="true" size={18} />
            )}
          </button>
        </div>
      </div>

      {topEntries.length > 0 ? (
        <ol className="podium-list" aria-label={`Top 3 ${title}`}>
          {topEntries.map((entry) => (
            <PodiumItem
              active={activeId === entry.memberId}
              entry={entry}
              investor={findInvestorProfile(investors, entry.memberName)}
              key={entry.memberId}
              kind={kind}
              leadText={getPodiumLeadText(entry, topEntries, kind)}
              onActivate={() => setActiveMemberId(entry.memberId)}
              style={getPodiumItemStyle(entry, kind, maxMetricValue)}
            />
          ))}
        </ol>
      ) : (
        <div className="empty-panel">
          <Medal aria-hidden="true" size={20} />
          <p>{emptyLabel}</p>
        </div>
      )}

      <RankingTable
        entries={entries}
        investors={investors}
        kind={kind}
        title={title}
      />
    </section>
  );
}

function PodiumItem({
  active,
  entry,
  investor,
  kind,
  leadText,
  onActivate,
  style,
}: {
  readonly active: boolean;
  readonly entry: RankingEntry;
  readonly investor?: InvestorProfile;
  readonly kind: RankingKind;
  readonly leadText?: string;
  readonly onActivate: () => void;
  readonly style: PodiumItemStyle;
}) {
  const podiumMetal = getPodiumMetal(entry.position);

  return (
    <li
      className={active ? 'podium-item is-active' : 'podium-item'}
      data-position={entry.position}
      data-testid={`podium-${kind}-${entry.position}`}
      style={style}
    >
      <button
        aria-label={`Destacar ${entry.position}º lugar: ${entry.memberName}`}
        aria-pressed={active}
        className="podium-card-button"
        onClick={onActivate}
        type="button"
      >
        <span className="podium-card-top">
          {investor ? (
            <InvestorImage investor={investor} variant="member" />
          ) : (
            <span className="investor-image investor-image--member">
              {getInvestorInitials(entry.memberName)}
            </span>
          )}
        </span>
        <span className="podium-stage" data-podium-metal={podiumMetal}>
          <span className="podium-rank">
            {entry.position === 1 ? (
              <Crown aria-hidden="true" size={18} />
            ) : (
              <Trophy aria-hidden="true" size={16} />
            )}
            <span>{entry.position}º</span>
          </span>
          <span className="podium-name">{entry.memberName}</span>
          <span className="podium-channel">{entry.sourceChannel}</span>
          <strong>{getPrimaryMetric(entry, kind)}</strong>
          <span className="podium-secondary">
            {kind === 'closer'
              ? `${formatNumber(entry.logos)} logos`
              : `${formatNumber(entry.meetingsHeld)} reuniões`}
          </span>
          {leadText ? <span className="podium-lead">{leadText}</span> : null}
        </span>
      </button>
    </li>
  );
}

function RankingTable({
  entries,
  investors,
  kind,
  title,
}: {
  readonly entries: readonly RankingEntry[];
  readonly investors: readonly InvestorProfile[];
  readonly kind: RankingKind;
  readonly title: string;
}) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Lista completa de {title}</caption>
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">Integrante</th>
            <th scope="col">Canal</th>
            {kind === 'closer' ? (
              <>
                <th scope="col">Receita</th>
                <th scope="col">Logos</th>
              </>
            ) : (
              <th scope="col">Reuniões</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <tr key={entry.memberId}>
                <td>{entry.position}º</td>
                <td>
                  <div className="member-cell">
                    {getMemberInvestorImage(investors, entry)}
                    <strong>{entry.memberName}</strong>
                  </div>
                </td>
                <td>{entry.sourceChannel}</td>
                {kind === 'closer' ? (
                  <>
                    <td>{formatCurrency(entry.revenue)}</td>
                    <td>{formatNumber(entry.logos)}</td>
                  </>
                ) : (
                  <td>{formatNumber(entry.meetingsHeld)}</td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={kind === 'closer' ? 5 : 4}>
                Sem linhas válidas para listar neste período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getMemberInvestorImage(
  investors: readonly InvestorProfile[],
  entry: RankingEntry,
) {
  const investor = findInvestorProfile(investors, entry.memberName);

  if (investor) {
    return <InvestorImage investor={investor} variant="member" />;
  }

  return (
    <span className="investor-image investor-image--member">
      {getInvestorInitials(entry.memberName)}
    </span>
  );
}

function StateCard({
  body,
  icon: Icon,
  title,
  tone,
}: {
  readonly body: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly tone: 'danger' | 'neutral' | 'warning';
}) {
  return (
    <section className={`state-card state-card--${tone}`} role="status">
      <div className="state-icon" aria-hidden="true">
        <Icon size={22} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
  );
}

async function loadRankingFixture(): Promise<RankingDataState> {
  const loader = fixtureModules['./data/rankingFixture.ts'];

  if (!loader) {
    throw new Error(
      'Fixture local não encontrada em src/data/rankingFixture.ts.',
    );
  }

  const module = await loader();
  const rows = extractRows(module);
  const periods = extractPeriods(module);

  return createReadyState({
    periods,
    rows,
    sourceInfo: extractSourceInfo(module.sourceSpreadsheet),
  });
}

function createReadyState({
  periods,
  rows,
  sourceInfo,
}: {
  readonly periods?: readonly PeriodFilter[];
  readonly rows: readonly RawRankingRow[];
  readonly sourceInfo?: SourceInfo;
}): RankingDataState {
  if (periods && periods.length > 0) {
    return {
      status: 'ready',
      periods: periods.map(normalizePeriodFilter),
      rows,
      sourceInfo,
    };
  }

  return {
    status: 'ready',
    periods: mergePeriodFilters(DEFAULT_PERIODS, [], rows),
    rows,
    sourceInfo,
  };
}

function extractRows(module: RankingFixtureModule): readonly RawRankingRow[] {
  const rows = Array.isArray(module.rankingRows)
    ? module.rankingRows
    : module.rows;

  if (!Array.isArray(rows) || !rows.every(isRawRankingRow)) {
    throw new Error(
      'A fixture precisa exportar rankingRows como RawRankingRow[].',
    );
  }

  return rows;
}

function extractPeriods(module: RankingFixtureModule): readonly PeriodFilter[] {
  const periods = Array.isArray(module.periodFilters)
    ? module.periodFilters
    : module.periods;

  if (!Array.isArray(periods)) {
    return [];
  }

  return periods.filter(isPeriodFilter);
}

function extractSourceInfo(value: unknown): SourceInfo | undefined {
  if (!isRecord(value) || typeof value.title !== 'string') {
    return undefined;
  }

  return {
    title: value.title,
    sheet: typeof value.sheet === 'string' ? value.sheet : undefined,
  };
}

function isRawRankingRow(value: unknown): value is RawRankingRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.period === 'string' &&
    (value.role === 'closer' || value.role === 'sdr') &&
    typeof value.memberId === 'string' &&
    typeof value.memberName === 'string' &&
    isOptionalNumber(value.revenue) &&
    isOptionalNumber(value.logos) &&
    isOptionalNumber(value.meetingsHeld) &&
    (value.sourceChannel === undefined ||
      typeof value.sourceChannel === 'string')
  );
}

function isPeriodFilter(value: unknown): value is PeriodFilter {
  return (
    isRecord(value) &&
    typeof value.start === 'string' &&
    typeof value.end === 'string' &&
    typeof value.label === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number';
}

function mergePeriodFilters(
  defaults: readonly PeriodFilter[],
  configured: readonly PeriodFilter[],
  rows: readonly RawRankingRow[],
): readonly PeriodFilter[] {
  const byMonth = new Map<string, PeriodFilter>();

  for (const period of [...defaults, ...configured, ...derivePeriods(rows)]) {
    const normalized = normalizePeriodFilter(period);
    byMonth.set(getPeriodMonth(normalized), normalized);
  }

  return Array.from(byMonth.values());
}

function derivePeriods(
  rows: readonly RawRankingRow[],
): readonly PeriodFilter[] {
  const months = new Set<string>();

  for (const row of rows) {
    const month = row.period.slice(0, 7);

    if (/^\d{4}-\d{2}$/.test(month)) {
      months.add(month);
    }
  }

  return Array.from(months).map(createMonthPeriod);
}

function normalizePeriodFilter(period: PeriodFilter): PeriodFilter {
  const month = getPeriodMonth(period);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return period;
  }

  return {
    ...period,
    start: period.start.length === 7 ? `${month}-01` : period.start,
    end: period.end || createMonthPeriod(month).end,
  };
}

function createMonthPeriod(month: string): PeriodFilter {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
    label: `${monthLabels[monthNumber - 1] ?? monthText}/${year}`,
  };
}

function getPeriodMonth(period: PeriodFilter): string {
  return period.start.slice(0, 7);
}

function getPeriodKey(period: PeriodFilter): string {
  return `${period.start}|${period.end}|${period.label}`;
}

function getPrimaryMetric(entry: RankingEntry, kind: RankingKind): string {
  if (kind === 'closer') {
    return formatCurrency(entry.revenue);
  }

  return `${formatNumber(entry.meetingsHeld)} reuniões`;
}

function getRankingMetricValue(entry: RankingEntry, kind: RankingKind): number {
  return kind === 'closer' ? entry.revenue : entry.meetingsHeld;
}

function getPodiumMetal(position: number): 'gold' | 'silver' | 'bronze' {
  if (position === 1) {
    return 'gold';
  }

  if (position === 2) {
    return 'silver';
  }

  return 'bronze';
}

function getPodiumItemStyle(
  entry: RankingEntry,
  kind: RankingKind,
  maxMetricValue: number,
): PodiumItemStyle {
  const metricValue = getRankingMetricValue(entry, kind);
  const share =
    maxMetricValue > 0
      ? Math.min(1, Math.max(0.06, metricValue / maxMetricValue))
      : entry.position === 1
        ? 1
        : 0.12;

  const extraWinnerHeight = entry.position === 1 ? 20 : 0;
  const height = Math.round(132 + share * 164 + extraWinnerHeight);
  const fill = Math.round(18 + share * 76);

  return {
    '--podium-fill': `${fill}%`,
    '--podium-height': `${height}px`,
  };
}

function getPodiumLeadText(
  entry: RankingEntry,
  entries: readonly RankingEntry[],
  kind: RankingKind,
): string | undefined {
  const secondEntry = entries[1];

  if (!secondEntry || entry.memberId !== entries[0]?.memberId) {
    return undefined;
  }

  const difference =
    getRankingMetricValue(entry, kind) -
    getRankingMetricValue(secondEntry, kind);

  if (difference <= 0) {
    return undefined;
  }

  if (kind === 'closer') {
    return `+${formatCurrency(difference)} sobre o 2º`;
  }

  return `+${formatNumber(difference)} reuniões sobre o 2º`;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
