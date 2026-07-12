import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
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
  useCallback,
  useMemo,
  useRef,
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
  getCurrentPeriodMonth,
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
  readonly investors?: unknown;
  readonly rankingRows?: unknown;
  readonly rows?: unknown;
  readonly periodFilters?: unknown;
  readonly periods?: unknown;
  readonly sourceSpreadsheet?: unknown;
}

interface RankingApiPayload {
  readonly investors?: unknown;
  readonly rows?: unknown;
  readonly periodFilters?: unknown;
  readonly periods?: unknown;
  readonly sourceSpreadsheet?: unknown;
}

interface ToastySignalApiPayload {
  readonly effect?: unknown;
  readonly id?: unknown;
  readonly serverNow?: unknown;
  readonly triggeredAt?: unknown;
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
      readonly investors: readonly InvestorProfile[];
      readonly periods: readonly PeriodFilter[];
      readonly rows: readonly RawRankingRow[];
      readonly sourceInfo?: SourceInfo;
    };

type RankingKind = 'closer' | 'sdr';
type RemoteEffect =
  | 'brasil-sil-sil'
  | 'ele-gosta'
  | 'musica-brasil'
  | 'rapaz'
  | 'toasty'
  | 'uuii';
type ToastyControlState = 'idle' | 'sending' | 'sent' | 'error';
type ToastyTriggerOptions = {
  readonly shouldPlaySound?: boolean;
};

interface RemoteEffectConfig {
  readonly ariaLabel: string;
  readonly audioSrc: string;
  readonly buttonLabel: string;
  readonly label: string;
  readonly sentMessage: string;
  readonly visibleMs?: number;
}

type PodiumItemStyle = CSSProperties & {
  readonly '--podium-fill': string;
  readonly '--podium-height': string;
  readonly '--podium-order': string;
};

interface PodiumPrimaryMetric {
  readonly label?: string;
  readonly numberText: string;
}

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

const LIVE_RANKING_ENDPOINT = '/api/ranking';
const LIVE_REFRESH_INTERVAL_MS = 10_000;
const PODIUM_CROWN_SRC = '/podium-crown-20260611.png';
const SDR_PODIUM_EXCLUDED_MEMBER_IDS = new Set([
  'lucas-macedo',
  'lucas-moura',
  'miguel-de-oliveira-guimaraes-vieira',
]);
const ELE_GOSTA_AUDIO_SRC = '/easter-eggs/rodrigo-faro-ele-gosta.mp3';
const BRASIL_SIL_SIL_AUDIO_SRC = '/easter-eggs/jingle-goal-brasil-sil-sil.mp3';
const BRASIL_MUSICA_AUDIO_SRC = '/easter-eggs/jingle-goal-brasil-musica.mp3';
const RAPAZ_AUDIO_SRC = '/easter-eggs/rapaz-xaropinho.mp3';
const TOASTY_AUDIO_SRC = '/easter-eggs/denner-toasty-v2.mp3';
const TOASTY_CONTROL_ENDPOINT = '/api/toasty';
const TOASTY_IMAGE_SRC = '/easter-eggs/denner-toasty-tv-safe-20260611.png';
const UUII_AUDIO_SRC = '/easter-eggs/rodrigo-faro-uuii.mp3';
const TOASTY_INTERVAL_MS = 300_000;
const TOASTY_INITIAL_SIGNAL_MAX_AGE_MS = 10_000;
const TOASTY_POLL_INTERVAL_MS = 2_000;
const TOASTY_SIGNAL_MAX_AGE_MS = 120_000;
const TOASTY_VISIBLE_MS = 5_200;
const PODIUM_HEIGHT_BY_POSITION = {
  1: 304,
  2: 208,
  3: 170,
  4: 136,
  5: 112,
} as const;
const PODIUM_VISUAL_ORDER_BY_POSITION = {
  1: 3,
  2: 2,
  3: 4,
  4: 1,
  5: 5,
} as const;
const REMOTE_EFFECTS = [
  'toasty',
  'rapaz',
  'uuii',
  'ele-gosta',
  'brasil-sil-sil',
  'musica-brasil',
] as const;
const REMOTE_EFFECT_CONFIG: Record<RemoteEffect, RemoteEffectConfig> = {
  'brasil-sil-sil': {
    ariaLabel: 'Denner Brasil Sil Sil',
    audioSrc: BRASIL_SIL_SIL_AUDIO_SRC,
    buttonLabel: 'Soltar Brasil Sil Sil',
    label: 'BRASIL SIL SIL!',
    sentMessage: 'Comando enviado. O Denner Brasil Sil Sil vai aparecer na TV.',
    visibleMs: 4_000,
  },
  'ele-gosta': {
    ariaLabel: 'Denner Ele Gosta',
    audioSrc: ELE_GOSTA_AUDIO_SRC,
    buttonLabel: 'Soltar Ele Gosta',
    label: 'ELE GOSTA!',
    sentMessage: 'Comando enviado. O Denner Ele Gosta vai aparecer na TV.',
  },
  'musica-brasil': {
    ariaLabel: 'Denner Música Brasil',
    audioSrc: BRASIL_MUSICA_AUDIO_SRC,
    buttonLabel: 'Soltar Música Brasil',
    label: 'MÚSICA BRASIL!',
    sentMessage: 'Comando enviado. O Denner Música Brasil vai aparecer na TV.',
    visibleMs: 9_500,
  },
  rapaz: {
    ariaLabel: 'Denner Rapaz',
    audioSrc: RAPAZ_AUDIO_SRC,
    buttonLabel: 'Soltar Rapaz',
    label: 'RAPAZ!',
    sentMessage: 'Comando enviado. O Denner Rapaz vai aparecer na TV.',
  },
  toasty: {
    ariaLabel: 'Denner Toasty',
    audioSrc: TOASTY_AUDIO_SRC,
    buttonLabel: 'Soltar Toasty',
    label: 'TOASTY!',
    sentMessage: 'Comando enviado. O Denner vai aparecer na TV.',
  },
  uuii: {
    ariaLabel: 'Denner UUII',
    audioSrc: UUII_AUDIO_SRC,
    buttonLabel: 'Soltar UUII',
    label: 'UUII!',
    sentMessage: 'Comando enviado. O Denner UUII vai aparecer na TV.',
  },
};

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

  const periods = useMemo(
    () => (dataState.status === 'ready' ? dataState.periods : []),
    [dataState],
  );
  const investors = useMemo(
    () =>
      initialInvestors ??
      (dataState.status === 'ready'
        ? mergeInvestorProfiles(investorProfiles, dataState.investors)
        : investorProfiles),
    [dataState, initialInvestors],
  );
  const requestedPeriodMonth = useMemo(getRequestedPeriodMonth, []);
  const hasManualPeriodSelectionRef = useRef(false);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() =>
    getPeriodKey(findPreferredPeriod(periods, requestedPeriodMonth)),
  );
  const [expandedPanelKind, setExpandedPanelKind] =
    useState<RankingKind | null>(null);
  const [isToastySoundBlocked, setIsToastySoundBlocked] = useState(false);
  const [visibleEffect, setVisibleEffect] = useState<RemoteEffect | null>(null);
  const [toastyControlState, setToastyControlState] =
    useState<ToastyControlState>('idle');
  const [lastSentEffect, setLastSentEffect] = useState<RemoteEffect>('toasty');
  const hideToastyTimeoutRef = useRef<number | undefined>(undefined);
  const lastToastySignalIdRef = useRef<string | null>(null);
  const blockedEffectRef = useRef<RemoteEffect>('toasty');
  const effectAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioEffectRef = useRef<RemoteEffect | null>(null);

  const isToastyControl = useMemo(
    () =>
      new URLSearchParams(window.location.search).get('control') === 'toasty',
    [],
  );
  const toastyControlKey = useMemo(
    () => new URLSearchParams(window.location.search).get('key') ?? '',
    [],
  );

  const selectedPeriod =
    periods.find((period) => getPeriodKey(period) === selectedPeriodKey) ??
    findPreferredPeriod(periods, requestedPeriodMonth);
  const selectedPeriodMonthRef = useRef(getPeriodMonth(selectedPeriod));

  useEffect(() => {
    const image = new Image();
    image.src = TOASTY_IMAGE_SRC;
  }, []);

  useEffect(() => {
    selectedPeriodMonthRef.current = getPeriodMonth(selectedPeriod);
  }, [selectedPeriod]);

  const ranking = useMemo<RankingResult | null>(() => {
    if (dataState.status !== 'ready') {
      return null;
    }

    return buildRanking(dataState.rows, selectedPeriod);
  }, [dataState, selectedPeriod]);

  const getEffectAudio = useCallback((effect: RemoteEffect) => {
    let audio = effectAudioRef.current;

    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.9;
      effectAudioRef.current = audio;
    }

    if (currentAudioEffectRef.current !== effect) {
      audio.src = REMOTE_EFFECT_CONFIG[effect].audioSrc;
      audio.load();
      currentAudioEffectRef.current = effect;
    }

    return audio;
  }, []);

  const playEffectSound = useCallback(
    async (effect: RemoteEffect) => {
      const audio = getEffectAudio(effect);

      audio.pause();
      audio.currentTime = 0;
      blockedEffectRef.current = effect;

      try {
        await audio.play();
        setIsToastySoundBlocked(false);
      } catch {
        setIsToastySoundBlocked(true);
      }
    },
    [getEffectAudio],
  );

  const stopEffectSound = useCallback((effect: RemoteEffect) => {
    const audio = effectAudioRef.current;

    if (!audio || currentAudioEffectRef.current !== effect) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playBlockedEffectSound = useCallback(
    () => playEffectSound(blockedEffectRef.current),
    [playEffectSound],
  );

  const triggerEffect = useCallback(
    (
      effect: RemoteEffect,
      { shouldPlaySound = true }: ToastyTriggerOptions = {},
    ) => {
      setVisibleEffect(effect);
      REMOTE_EFFECTS.filter((nextEffect) => nextEffect !== effect).forEach(
        stopEffectSound,
      );

      if (shouldPlaySound) {
        void playEffectSound(effect);
      }

      if (hideToastyTimeoutRef.current !== undefined) {
        window.clearTimeout(hideToastyTimeoutRef.current);
      }

      hideToastyTimeoutRef.current = window.setTimeout(() => {
        setVisibleEffect(null);
        stopEffectSound(effect);
        hideToastyTimeoutRef.current = undefined;
      }, REMOTE_EFFECT_CONFIG[effect].visibleMs ?? TOASTY_VISIBLE_MS);
    },
    [playEffectSound, stopEffectSound],
  );

  const triggerToasty = useCallback(
    (options?: ToastyTriggerOptions) => {
      triggerEffect('toasty', options);
    },
    [triggerEffect],
  );

  const triggerRemoteEffect = useCallback(
    (effect: RemoteEffect) => {
      triggerEffect(effect);
    },
    [triggerEffect],
  );

  const triggerRemoteControlEffect = useCallback(
    async (effect: RemoteEffect) => {
      const url = new URL(TOASTY_CONTROL_ENDPOINT, window.location.href);
      const headers = new Headers();

      url.searchParams.set('effect', effect);

      if (toastyControlKey) {
        headers.set('x-toasty-key', toastyControlKey);
        url.searchParams.set('key', toastyControlKey);
      }

      setLastSentEffect(effect);
      setToastyControlState('sending');

      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers,
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`API Toasty retornou ${response.status}.`);
        }

        setToastyControlState('sent');
        if (effect === 'toasty') {
          triggerToasty({ shouldPlaySound: false });
        }
      } catch {
        setToastyControlState('error');
      }
    },
    [toastyControlKey, triggerToasty],
  );

  const requestLiveRankingPeriod = useCallback(
    (periodMonth: string) => {
      if (initialRows || initialError) {
        return;
      }

      loadLiveRankingData(periodMonth)
        .then((nextState) => {
          setDataState(nextState);
        })
        .catch(() => {
          // Keep the last known good ranking on transient spreadsheet errors.
        });
    },
    [initialError, initialRows],
  );

  useEffect(() => {
    if (initialRows || initialError) {
      return;
    }

    let isActive = true;

    loadRankingData(requestedPeriodMonth)
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

    const getRefreshPeriodMonth = () =>
      hasManualPeriodSelectionRef.current
        ? selectedPeriodMonthRef.current
        : requestedPeriodMonth;

    const refreshLiveRanking = () => {
      loadLiveRankingData(getRefreshPeriodMonth())
        .then((nextState) => {
          if (isActive) {
            setDataState(nextState);
          }
        })
        .catch(() => {
          // Keep the last known good ranking on transient spreadsheet errors.
        });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveRanking();
      }
    };

    const intervalId = window.setInterval(
      refreshLiveRanking,
      LIVE_REFRESH_INTERVAL_MS,
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshLiveRanking);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshLiveRanking);
    };
  }, [initialError, initialRows, requestedPeriodMonth]);

  useEffect(() => {
    const selectedExists = periods.some(
      (period) => getPeriodKey(period) === selectedPeriodKey,
    );
    const preferredKey = getPeriodKey(
      findPreferredPeriod(periods, requestedPeriodMonth),
    );

    if (hasManualPeriodSelectionRef.current) {
      if (!selectedExists) {
        setSelectedPeriodKey(preferredKey);
      }

      return;
    }

    if (!selectedExists || selectedPeriodKey !== preferredKey) {
      setSelectedPeriodKey(preferredKey);
    }
  }, [periods, requestedPeriodMonth, selectedPeriodKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      triggerToasty({ shouldPlaySound: false });
    }, TOASTY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);

      if (hideToastyTimeoutRef.current !== undefined) {
        window.clearTimeout(hideToastyTimeoutRef.current);
      }

      stopEffectSound('toasty');
    };
  }, [stopEffectSound, triggerToasty]);

  useEffect(() => {
    if (initialRows || initialError || isToastyControl) {
      return;
    }

    let isActive = true;

    const pollRemoteToasty = () => {
      loadToastySignal()
        .then((signal) => {
          if (!isActive || !signal) {
            return;
          }

          const isFreshSignal = isRecentToastySignal(
            signal,
            TOASTY_SIGNAL_MAX_AGE_MS,
          );

          if (lastToastySignalIdRef.current === signal.id) {
            return;
          }

          if (lastToastySignalIdRef.current === null) {
            lastToastySignalIdRef.current = signal.id;

            if (
              signal.id !== '0' &&
              isRecentToastySignal(signal, TOASTY_INITIAL_SIGNAL_MAX_AGE_MS)
            ) {
              triggerRemoteEffect(signal.effect);
            }

            return;
          }

          lastToastySignalIdRef.current = signal.id;

          if (signal.id !== '0' && isFreshSignal) {
            triggerRemoteEffect(signal.effect);
          }
        })
        .catch(() => {
          // Remote control is optional; keep the ranking running if it fails.
        });
    };

    const intervalId = window.setInterval(
      pollRemoteToasty,
      TOASTY_POLL_INTERVAL_MS,
    );

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [initialError, initialRows, isToastyControl, triggerRemoteEffect]);

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

  if (isToastyControl) {
    return (
      <ToastyControlPanel
        lastSentEffect={lastSentEffect}
        onTrigger={triggerRemoteControlEffect}
        status={toastyControlState}
      />
    );
  }

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        className="toasty-image-preload"
        decoding="sync"
        height="1"
        loading="eager"
        src={TOASTY_IMAGE_SRC}
        width="1"
      />
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
              Visão operacional por período, com pódio dos cinco primeiros,
              ranking completo e leitura rápida para tomada de decisão.
            </p>
          </div>

          {periods.length > 0 ? (
            <div
              className="period-control"
              aria-labelledby="period-control-label"
            >
              <span className="period-label" id="period-control-label">
                Período
              </span>
              <div className="period-select-shell">
                <CalendarDays aria-hidden="true" size={18} />
                <select
                  aria-labelledby="period-control-label"
                  onChange={(event) => {
                    const periodMonth = event.target.value;
                    const period = periods.find(
                      (candidate) => getPeriodMonth(candidate) === periodMonth,
                    );

                    if (!period) {
                      return;
                    }

                    hasManualPeriodSelectionRef.current = true;
                    setSelectedPeriodKey(getPeriodKey(period));
                    requestLiveRankingPeriod(periodMonth);
                  }}
                  value={getPeriodMonth(selectedPeriod)}
                >
                  {periods.map((period) => (
                    <option
                      key={getPeriodKey(period)}
                      value={getPeriodMonth(period)}
                    >
                      {period.label}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" size={18} />
              </div>
            </div>
          ) : null}
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

      {visibleEffect ? (
        <DennerToasty
          effect={visibleEffect}
          expanded={expandedPanelKind !== null}
        />
      ) : null}
      {isToastySoundBlocked ? (
        <button
          aria-label="Ativar som do Toasty"
          className="toasty-sound-enable"
          onClick={() => void playBlockedEffectSound()}
          type="button"
        >
          Ativar som
        </button>
      ) : null}
    </>
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
  const topEntries = getPodiumEntries(entries, kind);
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
        <ol className="podium-list" aria-label={`Top 5 ${title}`}>
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
  const primaryMetric = getPrimaryMetric(entry, kind);
  const primaryMetricLabel = primaryMetric.label
    ? `${primaryMetric.numberText} ${primaryMetric.label}`
    : primaryMetric.numberText;

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
          {entry.position === 1 ? (
            <span className="podium-v4-crown" aria-hidden="true">
              <img
                alt=""
                decoding="async"
                height="354"
                loading="eager"
                src={PODIUM_CROWN_SRC}
                width="512"
              />
            </span>
          ) : null}
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
          <strong
            aria-label={primaryMetricLabel}
            className="podium-primary-metric"
          >
            <span className="podium-metric-number">
              {primaryMetric.numberText}
            </span>
            {primaryMetric.label ? (
              <span className="podium-metric-label">{primaryMetric.label}</span>
            ) : null}
          </strong>
          <span className="podium-secondary">
            {kind === 'closer'
              ? `${formatNumber(entry.logos)} logos`
              : formatMeetingsLabel(entry.meetingsHeld)}
          </span>
          {leadText ? <span className="podium-lead">{leadText}</span> : null}
        </span>
      </button>
    </li>
  );
}

function DennerToasty({
  effect,
  expanded,
}: {
  readonly effect: RemoteEffect;
  readonly expanded: boolean;
}) {
  const effectConfig = REMOTE_EFFECT_CONFIG[effect];

  return (
    <aside
      className={
        expanded
          ? 'toasty-easter-egg toasty-easter-egg--over-expanded'
          : 'toasty-easter-egg'
      }
      aria-label={effectConfig.ariaLabel}
    >
      <img
        alt="Denner"
        decoding="sync"
        height="693"
        loading="eager"
        src={TOASTY_IMAGE_SRC}
        width="520"
      />
      <strong>{effectConfig.label}</strong>
    </aside>
  );
}

function ToastyControlPanel({
  lastSentEffect,
  onTrigger,
  status,
}: {
  readonly lastSentEffect: RemoteEffect;
  readonly onTrigger: (effect: RemoteEffect) => Promise<void>;
  readonly status: ToastyControlState;
}) {
  const statusLabel = {
    error: 'Não consegui acionar. Tenta de novo.',
    idle: 'Pronto para acionar na tela do ranking.',
    sending: 'Enviando comando...',
    sent: REMOTE_EFFECT_CONFIG[lastSentEffect].sentMessage,
  } satisfies Record<ToastyControlState, string>;

  return (
    <main className="control-shell">
      <section className="control-card" aria-labelledby="control-title">
        <img src="/v4logo.png" alt="V4 Company" />
        <p className="eyebrow">Controle remoto</p>
        <h1 id="control-title">Efeitos da TV</h1>
        <div className="control-actions">
          {REMOTE_EFFECTS.map((effect, index) => (
            <button
              className={
                index === 0
                  ? 'control-trigger'
                  : 'control-trigger control-trigger--secondary'
              }
              disabled={status === 'sending'}
              key={effect}
              onClick={() => void onTrigger(effect)}
              type="button"
            >
              {REMOTE_EFFECT_CONFIG[effect].buttonLabel}
            </button>
          ))}
        </div>
        <p className={`control-status control-status--${status}`}>
          {statusLabel[status]}
        </p>
      </section>
    </main>
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
  const maxMeetingsHeld = Math.max(
    1,
    ...entries.map((entry) => entry.meetingsHeld),
  );

  return (
    <div className="ranking-table-card">
      <div className="ranking-table-heading">
        <h3>Classificação geral</h3>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Lista completa de {title}</caption>
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Integrante</th>
              {kind === 'closer' ? (
                <>
                  <th scope="col">Receita</th>
                  <th scope="col">Logos</th>
                </>
              ) : (
                <>
                  <th scope="col">Reuniões</th>
                  <th scope="col">Progresso</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <tr key={entry.memberId}>
                  <td className={`rank-cell rank-cell--${entry.position}`}>
                    {entry.position}º
                  </td>
                  <td>
                    <div className="member-cell">
                      {getMemberInvestorImage(investors, entry)}
                      <strong>{entry.memberName}</strong>
                    </div>
                  </td>
                  {kind === 'closer' ? (
                    <>
                      <td>{formatCurrency(entry.revenue)}</td>
                      <td>{formatNumber(entry.logos)}</td>
                    </>
                  ) : (
                    <>
                      <td className="meet-count">
                        {formatNumber(entry.meetingsHeld)}
                      </td>
                      <td>
                        <div
                          aria-label={`Progresso de ${entry.memberName}`}
                          aria-valuemax={getProgressGoal(
                            entry,
                            maxMeetingsHeld,
                          )}
                          aria-valuemin={0}
                          aria-valuenow={entry.meetingsHeld}
                          aria-valuetext={getProgressValueText(
                            entry,
                            maxMeetingsHeld,
                          )}
                          className="ranking-progress"
                          role="progressbar"
                        >
                          <span
                            style={{
                              width: `${getProgressPercentage(
                                entry,
                                maxMeetingsHeld,
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  Sem linhas válidas para listar neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

function getProgressGoal(entry: RankingEntry, fallbackGoal: number): number {
  if (entry.monthlyGoal === null) {
    return fallbackGoal;
  }

  return entry.monthlyGoal > 0
    ? entry.monthlyGoal
    : Math.max(1, entry.meetingsHeld);
}

function getProgressPercentage(
  entry: RankingEntry,
  fallbackGoal: number,
): number {
  if (entry.monthlyGoal === 0) {
    return 0;
  }

  const goal = getProgressGoal(entry, fallbackGoal);

  return Math.min(100, Math.round((entry.meetingsHeld / goal) * 100));
}

function getProgressValueText(
  entry: RankingEntry,
  fallbackGoal: number,
): string {
  if (entry.monthlyGoal === 0) {
    return 'Meta mensal não definida';
  }

  const percentage = getProgressPercentage(entry, fallbackGoal);

  return entry.monthlyGoal === null
    ? `${percentage}% do maior resultado do período`
    : `${percentage}% da meta mensal`;
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
    investors: extractInvestors(module),
    periods,
    rows,
    sourceInfo: extractSourceInfo(module.sourceSpreadsheet),
  });
}

async function loadRankingData(
  periodMonth?: string | null,
): Promise<RankingDataState> {
  try {
    return await loadLiveRankingData(periodMonth);
  } catch {
    return loadRankingFixture();
  }
}

async function loadLiveRankingData(
  periodMonth?: string | null,
): Promise<RankingDataState> {
  const url = new URL(LIVE_RANKING_ENDPOINT, window.location.href);
  if (periodMonth) {
    url.searchParams.set('period', periodMonth);
  }
  url.searchParams.set('cachebust', String(Date.now()));

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API de ranking retornou ${response.status}.`);
  }

  const payload = (await response.json()) as RankingApiPayload;
  const rows = extractRows(payload);
  const periods = extractPeriods(payload);

  return createReadyState({
    investors: extractInvestors(payload),
    periods,
    rows,
    sourceInfo: extractSourceInfo(payload.sourceSpreadsheet),
  });
}

async function loadToastySignal(): Promise<{
  readonly effect: RemoteEffect;
  readonly id: string;
  readonly serverNow: string | null;
  readonly triggeredAt: string | null;
} | null> {
  const url = new URL(TOASTY_CONTROL_ENDPOINT, window.location.href);
  url.searchParams.set('effects', '1');
  url.searchParams.set('cachebust', String(Date.now()));

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ToastySignalApiPayload;

  if (typeof payload.id !== 'string') {
    return null;
  }

  return {
    effect: parseRemoteEffect(payload.effect),
    id: payload.id,
    serverNow: typeof payload.serverNow === 'string' ? payload.serverNow : null,
    triggeredAt:
      typeof payload.triggeredAt === 'string' ? payload.triggeredAt : null,
  };
}

function parseRemoteEffect(effect: unknown): RemoteEffect {
  return REMOTE_EFFECTS.includes(effect as RemoteEffect)
    ? (effect as RemoteEffect)
    : 'toasty';
}

function isRecentToastySignal(
  signal: {
    readonly serverNow: string | null;
    readonly triggeredAt: string | null;
  },
  maxAgeMs: number,
): boolean {
  if (!signal.triggeredAt) {
    return false;
  }

  const timestamp = Date.parse(signal.triggeredAt);
  const referenceTimestamp = signal.serverNow
    ? Date.parse(signal.serverNow)
    : Date.now();

  if (Number.isNaN(timestamp) || Number.isNaN(referenceTimestamp)) {
    return false;
  }

  return referenceTimestamp - timestamp <= maxAgeMs;
}

function createReadyState({
  periods,
  investors,
  rows,
  sourceInfo,
}: {
  readonly investors?: readonly InvestorProfile[];
  readonly periods?: readonly PeriodFilter[];
  readonly rows: readonly RawRankingRow[];
  readonly sourceInfo?: SourceInfo;
}): RankingDataState {
  if (periods && periods.length > 0) {
    return {
      status: 'ready',
      investors: investors ?? [],
      periods: sortPeriodsDescending(periods.map(normalizePeriodFilter)),
      rows,
      sourceInfo,
    };
  }

  return {
    status: 'ready',
    investors: investors ?? [],
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

function extractInvestors(
  module: RankingFixtureModule | RankingApiPayload,
): readonly InvestorProfile[] {
  const investors = module.investors;

  if (!Array.isArray(investors)) {
    return [];
  }

  return investors.filter(isInvestorProfile);
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
    isOptionalNumber(value.monthlyGoal) &&
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

function isInvestorProfile(value: unknown): value is InvestorProfile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isInvestorStatus(value.status) &&
    (value.aliases === undefined ||
      (Array.isArray(value.aliases) &&
        value.aliases.every((alias) => typeof alias === 'string'))) &&
    (value.roleLabel === undefined || typeof value.roleLabel === 'string') &&
    (value.imagePath === undefined || typeof value.imagePath === 'string')
  );
}

function isInvestorStatus(value: unknown): value is InvestorProfile['status'] {
  return value === 'active' || value === 'watch' || value === 'inactive';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number';
}

function mergeInvestorProfiles(
  localProfiles: readonly InvestorProfile[],
  dynamicProfiles: readonly InvestorProfile[],
): readonly InvestorProfile[] {
  const profilesById = new Map<string, InvestorProfile>();

  for (const profile of [...dynamicProfiles, ...localProfiles]) {
    if (!profilesById.has(profile.id)) {
      profilesById.set(profile.id, profile);
    }
  }

  return Array.from(profilesById.values());
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

  return sortPeriodsDescending(Array.from(byMonth.values()));
}

function sortPeriodsDescending(
  periods: readonly PeriodFilter[],
): readonly PeriodFilter[] {
  return [...periods].sort((left, right) =>
    getPeriodMonth(right).localeCompare(getPeriodMonth(left)),
  );
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

function getRequestedPeriodMonth(): string | null {
  const requestedPeriod = new URLSearchParams(window.location.search)
    .get('period')
    ?.trim();

  return requestedPeriod && /^\d{4}-\d{2}$/.test(requestedPeriod)
    ? requestedPeriod
    : null;
}

function findPreferredPeriod(
  periods: readonly PeriodFilter[],
  requestedPeriodMonth: string | null,
): PeriodFilter {
  if (requestedPeriodMonth) {
    const requestedPeriod = periods.find(
      (period) => getPeriodMonth(period) === requestedPeriodMonth,
    );

    if (requestedPeriod) {
      return requestedPeriod;
    }
  }

  const currentPeriodMonth = getCurrentPeriodMonth();

  return (
    periods.find((period) => getPeriodMonth(period) === currentPeriodMonth) ??
    periods.find((period) => getPeriodMonth(period) < currentPeriodMonth) ??
    periods[0] ??
    DEFAULT_PERIODS[0]
  );
}

function getPeriodMonth(period: PeriodFilter): string {
  return period.start.slice(0, 7);
}

function getPeriodKey(period: PeriodFilter): string {
  return `${period.start}|${period.end}|${period.label}`;
}

function getPrimaryMetric(
  entry: RankingEntry,
  kind: RankingKind,
): PodiumPrimaryMetric {
  if (kind === 'closer') {
    return {
      numberText: formatCurrency(entry.revenue),
    };
  }

  return {
    label: entry.meetingsHeld === 1 ? 'reunião' : 'reuniões',
    numberText: formatNumber(entry.meetingsHeld),
  };
}

function getRankingMetricValue(entry: RankingEntry, kind: RankingKind): number {
  return kind === 'closer' ? entry.revenue : entry.meetingsHeld;
}

function getPodiumEntries(
  entries: readonly RankingEntry[],
  kind: RankingKind,
): readonly RankingEntry[] {
  const eligibleEntries =
    kind === 'sdr'
      ? entries.filter(
          (entry) => !SDR_PODIUM_EXCLUDED_MEMBER_IDS.has(entry.memberId),
        )
      : entries;

  return eligibleEntries.slice(0, 5).map((entry, index) => ({
    ...entry,
    position: index + 1,
  }));
}

function getPodiumMetal(
  position: number,
): 'gold' | 'silver' | 'bronze' | 'slate' {
  if (position === 1) {
    return 'gold';
  }

  if (position === 2) {
    return 'silver';
  }

  if (position === 3) {
    return 'bronze';
  }

  return 'slate';
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

  const height =
    PODIUM_HEIGHT_BY_POSITION[
      entry.position as keyof typeof PODIUM_HEIGHT_BY_POSITION
    ] ?? PODIUM_HEIGHT_BY_POSITION[3];
  const order =
    PODIUM_VISUAL_ORDER_BY_POSITION[
      entry.position as keyof typeof PODIUM_VISUAL_ORDER_BY_POSITION
    ] ?? entry.position;
  const fill = Math.round(18 + share * 76);

  return {
    '--podium-fill': `${fill}%`,
    '--podium-height': `${height}px`,
    '--podium-order': String(order),
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

  return `+${formatMeetingsLabel(difference)} sobre o 2º`;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatMeetingsLabel(value: number): string {
  return `${formatNumber(value)} ${value === 1 ? 'reunião' : 'reuniões'}`;
}
