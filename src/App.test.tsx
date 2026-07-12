import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App.js';
import type { PeriodFilter, RawRankingRow } from './domain/ranking.js';

const periods: readonly PeriodFilter[] = [
  {
    start: '2026-05-01',
    end: '2026-05-31',
    label: 'Maio/2026',
  },
  {
    start: '2026-04-01',
    end: '2026-04-30',
    label: 'Abril/2026',
  },
  {
    start: '2026-06-01',
    end: '2026-06-30',
    label: 'Junho/2026',
  },
];
const mayAprilPeriods: readonly PeriodFilter[] = [periods[0], periods[1]];
const julyPeriod: PeriodFilter = {
  start: '2026-07-01',
  end: '2026-07-31',
  label: 'Julho/2026',
};
const augustPeriod: PeriodFilter = {
  start: '2026-08-01',
  end: '2026-08-31',
  label: 'Agosto/2026',
};

const rows: readonly RawRankingRow[] = [
  {
    period: '2026-05-01',
    role: 'closer',
    memberId: 'closer-macedo',
    memberName: 'Macedo Lucas Rodrigues',
    revenue: 126699,
    logos: 7,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-12',
    role: 'closer',
    memberId: 'closer-desempate',
    memberName: 'Closer Desempate',
    revenue: 17984,
    logos: 2,
    sourceChannel: 'Outbound',
  },
  {
    period: '2026-05-18',
    role: 'closer',
    memberId: 'closer-carlos',
    memberName: 'Carlos Guerra',
    revenue: 0,
    logos: 0,
    sourceChannel: 'Outbound',
  },
  {
    period: '2026-05-02',
    role: 'sdr',
    memberId: 'sdr-wilson',
    memberName: 'Wilson Junior',
    meetingsHeld: 29,
    sourceChannel: 'Inbound',
  },
  {
    period: '2026-05-04',
    role: 'sdr',
    memberId: 'sdr-lucas',
    memberName: 'Lucas Vieira',
    meetingsHeld: 18,
    sourceChannel: 'Inbound',
  },
  {
    period: '2026-04-15',
    role: 'sdr',
    memberId: 'sdr-old',
    memberName: 'Fora do Período',
    meetingsHeld: 9,
    sourceChannel: 'Inbound',
  },
  {
    period: '2026-05-10',
    role: 'closer',
    memberId: 'missing-revenue',
    memberName: 'Closer Sem Receita',
    logos: 2,
    sourceChannel: 'Auditoria',
  },
];

const juneRows: readonly RawRankingRow[] = [
  {
    period: '2026-06-02',
    role: 'sdr',
    memberId: 'sdr-emanuella',
    memberName: 'Emanuella',
    meetingsHeld: 4,
    monthlyGoal: 8,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-06-02',
    role: 'sdr',
    memberId: 'sdr-pedro-paulo',
    memberName: 'Pedro Paulo',
    meetingsHeld: 3,
    monthlyGoal: 6,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-06-02',
    role: 'sdr',
    memberId: 'sdr-matheus-caruzo',
    memberName: 'Matheus Caruzo',
    meetingsHeld: 2,
    monthlyGoal: 8,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-06-02',
    role: 'sdr',
    memberId: 'sdr-wilson-june',
    memberName: 'Wilson Junior',
    meetingsHeld: 1,
    monthlyGoal: 0,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-06-02',
    role: 'sdr',
    memberId: 'sdr-lucas-june',
    memberName: 'Lucas Moura',
    meetingsHeld: 1,
    monthlyGoal: 4,
    sourceChannel: 'Lead Broker',
  },
];
const rowsWithJune: readonly RawRankingRow[] = [...rows, ...juneRows];

function mockAudio(
  playMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
) {
  const instances: MockAudio[] = [];

  class MockAudio {
    currentTime = 0;
    load = vi.fn();
    pause = vi.fn();
    play = playMock;
    preload = '';
    src: string;
    volume = 1;

    constructor(src = '') {
      this.src = src;
      instances.push(this);
    }
  }

  vi.stubGlobal('Audio', MockAudio);

  return {
    instances,
    playMock,
  };
}

interface MockToastySignal {
  readonly effect?: string;
  readonly id: string;
  readonly serverNow?: string;
  readonly triggeredAt: string | null;
}

function mockLiveRankingAndToastySignal(
  nextSignals: readonly MockToastySignal[] = [
    {
      id: '0',
      triggeredAt: null,
    },
    {
      id: 'remote-1',
      triggeredAt: '2026-05-27T12:00:00.000Z',
    },
  ],
) {
  let toastyCallIndex = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/ranking')) {
      return Promise.resolve(
        new Response(JSON.stringify({ periodFilters: mayAprilPeriods, rows }), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        }),
      );
    }

    if (url.includes('/api/toasty')) {
      const signal =
        nextSignals[Math.min(toastyCallIndex, nextSignals.length - 1)] ??
        nextSignals[0];
      toastyCallIndex += 1;

      return Promise.resolve(
        new Response(JSON.stringify(signal), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        }),
      );
    }

    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('App', () => {
  beforeEach(() => {
    mockAudio();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  test('marca a raiz do app para diagnóstico do bundle publicado', () => {
    const { container } = render(
      <App initialRows={rows} initialPeriods={mayAprilPeriods} />,
    );

    expect(
      container.querySelector('main[data-app="ranking-closer-sdr"]'),
    ).not.toBeNull();
  });

  test('referencia fotos apenas dentro dos rankings de closers e SDRs', () => {
    const { container } = render(
      <App
        initialInvestors={[
          {
            id: 'wilson-de-carvalho-junior',
            name: 'Wilson de Carvalho Junior',
            aliases: ['Wilson Junior'],
            roleLabel: 'SDR',
            status: 'active',
            imagePath: '/investors/wilson-de-carvalho-junior.jpg',
          },
          {
            id: 'alexandre-ayres',
            name: 'Alexandre Ayres',
            roleLabel: 'COORDENADOR',
            status: 'active',
            imagePath: '/investors/alexandre-ayres.png',
          },
        ]}
        initialPeriods={mayAprilPeriods}
        initialRows={rows}
      />,
    );

    expect(
      screen.queryByText('Closers e SDRs em foco'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('V4 Visual')).not.toBeInTheDocument();
    expect(screen.queryByText(/fotos conectadas/i)).not.toBeInTheDocument();
    expect(
      container.querySelector(
        'img[src="/investors/wilson-de-carvalho-junior.jpg"]',
      ),
    ).not.toBeNull();
    expect(screen.getAllByText('Wilson Junior')).not.toHaveLength(0);
    expect(screen.queryByText('Alexandre Ayres')).not.toBeInTheDocument();
  });

  test('referencia Lucas Vieira da planilha como alias de Lucas Moura', () => {
    const { container } = render(
      <App initialRows={rows} initialPeriods={mayAprilPeriods} />,
    );

    expect(
      container.querySelector('img[src="/investors/14-lucas-moura.jpg"]'),
    ).not.toBeNull();
  });

  test('usa fotos locais dos novos SDRs e BDRs da planilha', () => {
    const { container } = render(
      <App
        initialRows={[
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-leticia-de-oliveira',
            memberName: 'Leticia de Oliveira',
            meetingsHeld: 4,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-tiago-lavinas',
            memberName: 'Tiago Lavinas',
            meetingsHeld: 3,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-caio-henrique',
            memberName: 'Caio Henrique',
            meetingsHeld: 2,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-daniel-dias',
            memberName: 'Daniel Dias',
            meetingsHeld: 1,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-joao-carlos',
            memberName: 'Joao Carlos',
            meetingsHeld: 1,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-paula-cristina',
            memberName: 'Paula Cristina',
            meetingsHeld: 0,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-raphaela-reis',
            memberName: 'Raphaela Reis',
            meetingsHeld: 0,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-vinicius-lopes',
            memberName: 'Vinicius Lopes',
            meetingsHeld: 0,
            sourceChannel: '',
          },
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-wendel-de-araujo',
            memberName: 'Wendel de Araujo',
            meetingsHeld: 0,
            sourceChannel: '',
          },
        ]}
        initialPeriods={mayAprilPeriods}
      />,
    );

    [
      '/investors/34-leticia-de-oliveira-chebom.png',
      '/investors/35-tiago-lavinas-da-silva-souza.jpg',
      '/investors/36-caio-henrique-guilherme-vieira-pentiado.png',
      '/investors/37-daniel-dias-do-nascimento.png',
      '/investors/38-joao-carlos-de-oliveira-costa.jpg',
      '/investors/39-paula-cristina-jesus-nunes-de-oliveira.png',
      '/investors/40-raphaela-reis-da-costa-moreira.png',
      '/investors/41-vinicius-lopes-de-oliveira.png',
      '/investors/42-wendel-de-araujo-veiga.png',
    ].forEach((imagePath) => {
      expect(container.querySelector(`img[src="${imagePath}"]`)).not.toBeNull();
    });
  });

  test('usa iniciais quando o integrante da planilha não tem imagem local', () => {
    render(
      <App
        initialRows={[
          {
            period: '2026-05-31',
            role: 'sdr',
            memberId: 'sdr-amanda-lima',
            memberName: 'Amanda Lima',
            meetingsHeld: 8,
            sourceChannel: 'Lead Broker',
          },
        ]}
        initialPeriods={mayAprilPeriods}
      />,
    );

    const sdrPanel = screen.getByRole('region', { name: 'SDR / Pré-vendas' });
    const sdrTable = within(sdrPanel).getByRole('table', {
      name: 'Lista completa de SDR / Pré-vendas',
    });

    expect(within(sdrTable).getByText('Amanda Lima')).toBeInTheDocument();
    expect(within(sdrTable).getByText('AL')).toBeInTheDocument();
  });

  test('renderiza os nomes calculados no ranking de closers e SDRs', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    expect(screen.getAllByText('Macedo Lucas Rodrigues')).not.toHaveLength(0);
    expect(screen.getAllByText('Wilson Junior')).not.toHaveLength(0);
    expect(screen.getAllByText('R$ 126.699')).not.toHaveLength(0);
    const meetingsMetric = screen.getAllByLabelText('29 reuniões')[0];

    expect(meetingsMetric).toBeInTheDocument();
    expect(
      meetingsMetric?.querySelector('.podium-metric-number'),
    ).toHaveTextContent('29');
    expect(
      meetingsMetric?.querySelector('.podium-metric-label'),
    ).toHaveTextContent('reuniões');
  });

  test('abre o mês mais recente retornado pela API em tempo real', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            periods: [periods[0], periods[2]],
            rows: rowsWithJune,
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR JUNHO/26 + 1 mês anterior',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    );

    render(<App />);

    expect(await screen.findByText('Junho/2026')).toBeInTheDocument();
    expect(await screen.findAllByText('Emanuella')).not.toHaveLength(0);
    expect(
      screen.queryByText('Macedo Lucas Rodrigues'),
    ).not.toBeInTheDocument();
  });

  test('abre o mês vigente mesmo quando existe uma aba mensal futura', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00-03:00'));

    render(
      <App
        initialRows={[
          {
            period: '2026-07-10',
            role: 'sdr',
            memberId: 'sdr-emanuella-july',
            memberName: 'Emanuella Julho',
            meetingsHeld: 4,
            sourceChannel: '',
          },
        ]}
        initialPeriods={[augustPeriod, julyPeriod, periods[2]]}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Período' })).toHaveValue(
      '2026-07',
    );
    expect(screen.getAllByText('Emanuella Julho')).not.toHaveLength(0);
    expect(
      screen.queryByText('Período sem ranking válido'),
    ).not.toBeInTheDocument();
  });

  test('abre o mês mais recente derivado das linhas quando a API não envia filtros', () => {
    render(<App initialRows={rowsWithJune} />);

    expect(screen.getAllByText('Junho/2026')).not.toHaveLength(0);
    expect(screen.getAllByText('Emanuella')).not.toHaveLength(0);
    expect(
      screen.queryByText('Macedo Lucas Rodrigues'),
    ).not.toBeInTheDocument();
  });

  test('busca somente o mês selecionado ao trocar período em tempo real', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            periods: [periods[2], periods[0]],
            rows: juneRows,
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR JUNHO/26',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            periods: [periods[2], periods[0]],
            rows,
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR MAIO/26',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findAllByText('Emanuella')).not.toHaveLength(0);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Período' }),
      '2026-05',
    );

    await waitFor(() => {
      expect(screen.getAllByText('Macedo Lucas Rodrigues')).not.toHaveLength(0);
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('period=2026-05');
  });

  test('respeita período mensal informado na URL', () => {
    window.history.pushState({}, '', '/?period=2026-05');

    render(
      <App
        initialRows={rowsWithJune}
        initialPeriods={[periods[2], periods[0]]}
      />,
    );

    expect(screen.getAllByText('Maio/2026')).not.toHaveLength(0);
    expect(screen.getAllByText('Macedo Lucas Rodrigues')).not.toHaveLength(0);
    expect(screen.queryByText('Emanuella')).not.toBeInTheDocument();
  });

  test('mostra todos os cinco pré-vendedores na tabela do ranking normal', () => {
    render(
      <App
        initialRows={rowsWithJune}
        initialPeriods={[periods[2], periods[0]]}
      />,
    );

    const sdrPanel = screen.getByRole('region', { name: 'SDR / Pré-vendas' });

    expect(within(sdrPanel).getByText('5 integrantes')).toBeInTheDocument();
    expect(within(sdrPanel).getAllByText('Emanuella')).not.toHaveLength(0);
    expect(within(sdrPanel).getAllByText('Pedro Paulo')).not.toHaveLength(0);
    expect(within(sdrPanel).getAllByText('Matheus Caruzo')).not.toHaveLength(0);
  });

  test('mantém lideranças na lista de SDRs, mas fora do pódio', () => {
    render(
      <App
        initialRows={[
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'lucas-macedo',
            memberName: 'Lucas Macedo',
            meetingsHeld: 20,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'miguel-de-oliveira-guimaraes-vieira',
            memberName: 'Miguel de Oliveira Guimarães Vieira',
            meetingsHeld: 19,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'lucas-moura',
            memberName: 'Lucas Moura',
            meetingsHeld: 18,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-emanuella',
            memberName: 'Emanuella',
            meetingsHeld: 8,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-pedro-paulo',
            memberName: 'Pedro Paulo',
            meetingsHeld: 7,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-matheus-caruzo',
            memberName: 'Matheus Caruzo',
            meetingsHeld: 3,
            sourceChannel: 'Lead Broker',
          },
        ]}
        initialPeriods={[periods[2]]}
      />,
    );

    const sdrPanel = screen.getByRole('region', { name: 'SDR / Pré-vendas' });
    const sdrPodium = screen.getByLabelText('Top 5 SDR / Pré-vendas');
    const sdrTable = within(sdrPanel).getByRole('table', {
      name: 'Lista completa de SDR / Pré-vendas',
    });

    expect(within(sdrTable).getByText('Lucas Macedo')).toBeInTheDocument();
    expect(
      within(sdrTable).getByText('Miguel de Oliveira Guimarães Vieira'),
    ).toBeInTheDocument();
    expect(within(sdrTable).getByText('Lucas Moura')).toBeInTheDocument();
    expect(
      within(sdrPodium).queryByText('Lucas Macedo'),
    ).not.toBeInTheDocument();
    expect(
      within(sdrPodium).queryByText('Miguel de Oliveira Guimarães Vieira'),
    ).not.toBeInTheDocument();
    expect(
      within(sdrPodium).queryByText('Lucas Moura'),
    ).not.toBeInTheDocument();
    expect(within(sdrPodium).getByTestId('podium-sdr-1')).toHaveTextContent(
      'Emanuella',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-2')).toHaveTextContent(
      'Pedro Paulo',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-3')).toHaveTextContent(
      'Matheus Caruzo',
    );
  });

  test('renderiza top 5 de SDRs na ordem visual do HTML de referência', () => {
    render(
      <App
        initialRows={[
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'lucas-macedo',
            memberName: 'Lucas Macedo',
            meetingsHeld: 20,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'lucas-moura',
            memberName: 'Lucas Moura',
            meetingsHeld: 18,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-emanuella',
            memberName: 'Emanuella',
            meetingsHeld: 8,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-pedro-paulo',
            memberName: 'Pedro Paulo',
            meetingsHeld: 7,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-matheus-caruzo',
            memberName: 'Matheus Caruzo',
            meetingsHeld: 6,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-novo',
            memberName: 'Novo SDR',
            meetingsHeld: 5,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-novo-bdr',
            memberName: 'Novo BDR',
            meetingsHeld: 4,
            sourceChannel: 'Lead Broker',
          },
          {
            period: '2026-06-02',
            role: 'sdr',
            memberId: 'sdr-extra',
            memberName: 'Extra SDR',
            meetingsHeld: 3,
            sourceChannel: 'Lead Broker',
          },
        ]}
        initialPeriods={[periods[2]]}
      />,
    );

    const sdrPodium = screen.getByLabelText('Top 5 SDR / Pré-vendas');

    expect(
      within(sdrPodium).queryByText('Lucas Macedo'),
    ).not.toBeInTheDocument();
    expect(
      within(sdrPodium).queryByText('Lucas Moura'),
    ).not.toBeInTheDocument();
    expect(within(sdrPodium).getByTestId('podium-sdr-1')).toHaveTextContent(
      'Emanuella',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-2')).toHaveTextContent(
      'Pedro Paulo',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-3')).toHaveTextContent(
      'Matheus Caruzo',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-4')).toHaveTextContent(
      'Novo SDR',
    );
    expect(within(sdrPodium).getByTestId('podium-sdr-5')).toHaveTextContent(
      'Novo BDR',
    );
    expect(
      within(sdrPodium)
        .getByTestId('podium-sdr-4')
        .style.getPropertyValue('--podium-order'),
    ).toBe('1');
    expect(
      within(sdrPodium)
        .getByTestId('podium-sdr-2')
        .style.getPropertyValue('--podium-order'),
    ).toBe('2');
    expect(
      within(sdrPodium)
        .getByTestId('podium-sdr-1')
        .style.getPropertyValue('--podium-order'),
    ).toBe('3');
    expect(
      within(sdrPodium)
        .getByTestId('podium-sdr-3')
        .style.getPropertyValue('--podium-order'),
    ).toBe('4');
    expect(
      within(sdrPodium)
        .getByTestId('podium-sdr-5')
        .style.getPropertyValue('--podium-order'),
    ).toBe('5');
  });

  test('mostra progresso na tabela de SDRs sem reintroduzir Canal', () => {
    render(
      <App
        initialRows={rowsWithJune}
        initialPeriods={[periods[2], periods[0]]}
      />,
    );

    const sdrPanel = screen.getByRole('region', { name: 'SDR / Pré-vendas' });
    const sdrTable = within(sdrPanel).getByRole('table', {
      name: 'Lista completa de SDR / Pré-vendas',
    });

    expect(
      within(sdrTable).getByRole('columnheader', { name: 'Progresso' }),
    ).toBeInTheDocument();
    const emanuellaProgress = within(sdrTable).getByRole('progressbar', {
      name: 'Progresso de Emanuella',
    });

    expect(emanuellaProgress).toHaveAttribute('aria-valuenow', '4');
    expect(emanuellaProgress).toHaveAttribute('aria-valuemax', '8');
    expect(emanuellaProgress.querySelector('span')).toHaveStyle({
      width: '50%',
    });

    const wilsonProgress = within(sdrTable).getByRole('progressbar', {
      name: 'Progresso de Wilson Junior',
    });

    expect(wilsonProgress).toHaveAttribute(
      'aria-valuetext',
      'Meta mensal não definida',
    );
    expect(wilsonProgress.querySelector('span')).toHaveStyle({ width: '0%' });
    expect(
      within(sdrTable).queryByRole('columnheader', { name: 'Canal' }),
    ).not.toBeInTheDocument();
  });

  test('não exibe coluna de canal nas tabelas do ranking', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    expect(
      screen.queryAllByRole('columnheader', { name: 'Canal' }),
    ).toHaveLength(0);
  });

  test('não exibe canal nos cards do pódio', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    expect(screen.queryAllByText('Lead Broker')).toHaveLength(0);
  });

  test('trocar o período recalcula o ranking exibido', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Período' }),
      '2026-04',
    );

    expect(screen.getAllByText('Fora do Período')).not.toHaveLength(0);
    expect(
      screen.queryByText('Macedo Lucas Rodrigues'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Sem closers válidos')).toBeInTheDocument();
  });

  test('não renderiza painel separado de inconsistências operacionais', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    expect(
      screen.queryByText('Inconsistências operacionais'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Closer Sem Receita')).not.toBeInTheDocument();
  });

  test('mostra estado vazio quando o período não tem linhas válidas', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={periods} />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Período' }),
      '2026-06',
    );

    expect(screen.getByText('Período sem ranking válido')).toBeInTheDocument();
    expect(screen.getByText('Sem closers válidos')).toBeInTheDocument();
    expect(screen.getByText('Sem SDRs válidos')).toBeInTheDocument();
  });

  test('mostra estado de erro quando a fonte local falha', () => {
    render(<App initialError="Falha controlada de leitura." />);

    expect(
      screen.getByText('Erro ao carregar a fonte local'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Falha controlada de leitura.'),
    ).toBeInTheDocument();
  });

  test('mostra estado carregando antes de resolver a fixture local', () => {
    render(<App />);

    expect(screen.getByText('Carregando ranking')).toBeInTheDocument();
  });

  test('carrega dados da API em tempo real antes da fixture local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            periods: [
              {
                label: 'Maio/2026',
                start: '2026-05-01',
                end: '2026-05-31',
              },
            ],
            rows: [
              {
                period: '2026-05-31',
                role: 'closer',
                memberId: 'lucas-macedo',
                memberName: 'Lucas Macedo',
                revenue: 42000,
                logos: 2,
                sourceChannel: 'Lead Broker',
              },
            ],
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR MAIO/26',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    );

    render(<App />);

    expect(
      await screen.findByText(/Planilha em tempo real/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('R$ 42.000')).not.toHaveLength(0);
  });

  test('usa fotos dinâmicas retornadas pela API para novos integrantes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            investors: [
              {
                id: 'nova-sdr',
                name: 'Nova SDR Completa',
                aliases: ['Nova SDR'],
                roleLabel: 'BDR',
                status: 'active',
                imagePath: 'https://images.example/nova-sdr.png',
              },
            ],
            periods: [
              {
                label: 'Maio/2026',
                start: '2026-05-01',
                end: '2026-05-31',
              },
            ],
            rows: [
              {
                period: '2026-05-31',
                role: 'sdr',
                memberId: 'sdr-nova-sdr',
                memberName: 'Nova SDR',
                meetingsHeld: 3,
                sourceChannel: '',
              },
            ],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    );

    const { container } = render(<App />);

    expect(await screen.findAllByText('Nova SDR')).not.toHaveLength(0);
    expect(
      container.querySelector('img[src="https://images.example/nova-sdr.png"]'),
    ).not.toBeNull();
  });

  test('atualiza dados da API automaticamente sem recarregar a página', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            periods: [periods[0]],
            rows: [
              {
                period: '2026-05-31',
                role: 'closer',
                memberId: 'lucas-macedo',
                memberName: 'Lucas Macedo',
                revenue: 1000,
                logos: 1,
                sourceChannel: 'Lead Broker',
              },
            ],
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR MAIO/26',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            periods: [periods[0]],
            rows: [
              {
                period: '2026-05-31',
                role: 'closer',
                memberId: 'lucas-macedo',
                memberName: 'Lucas Macedo',
                revenue: 2000,
                logos: 2,
                sourceChannel: 'Lead Broker',
              },
            ],
            sourceSpreadsheet: {
              title: 'Planilha em tempo real',
              sheet: 'CDR MAIO/26',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findAllByText('R$ 1.000')).not.toHaveLength(0);

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(screen.getAllByText('R$ 2.000')).not.toHaveLength(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('carrega somente maio na fonte local principal', async () => {
    render(<App />);

    await screen.findByText(/Controle de Resultados \| Alfradique & Co RJ/);

    const periodSelect = screen.getByRole('combobox', { name: 'Período' });

    expect(periodSelect).toHaveValue('2026-05');
    expect(within(periodSelect).getAllByRole('option')).toHaveLength(1);
  });

  test('mantém altura visual do pódio por posição', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    const closerPodium = screen.getByLabelText('Top 5 Closers');
    const sdrPodium = screen.getByLabelText('Top 5 SDR / Pré-vendas');
    const firstPlace = within(closerPodium).getByTestId('podium-closer-1');
    const secondPlace = within(closerPodium).getByTestId('podium-closer-2');
    const thirdPlace = within(closerPodium).getByTestId('podium-closer-3');
    const secondSdrPlace = within(sdrPodium).getByTestId('podium-sdr-2');

    const firstHeight = Number.parseInt(
      firstPlace.style.getPropertyValue('--podium-height'),
      10,
    );
    const secondHeight = Number.parseInt(
      secondPlace.style.getPropertyValue('--podium-height'),
      10,
    );
    const thirdHeight = Number.parseInt(
      thirdPlace.style.getPropertyValue('--podium-height'),
      10,
    );

    expect(firstHeight).toBeGreaterThan(secondHeight + 80);
    expect(secondHeight).toBeGreaterThan(thirdHeight);
    expect(secondSdrPlace.style.getPropertyValue('--podium-height')).toBe(
      secondPlace.style.getPropertyValue('--podium-height'),
    );
    expect(firstPlace.querySelector('.lucide-crown')).not.toBeNull();
    expect(firstPlace.querySelector('.podium-v4-crown img')).toHaveAttribute(
      'src',
      '/podium-crown-20260611.png',
    );
    expect(secondPlace.querySelector('.podium-v4-crown')).toBeNull();
  });

  test('exibe Denner Toasty automaticamente a cada cinco minutos', async () => {
    vi.useFakeTimers();

    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5_200);
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();
  });

  test('exibe Denner automaticamente sem tocar som', async () => {
    vi.useFakeTimers();
    const { playMock } = mockAudio();

    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();
    expect(playMock).not.toHaveBeenCalled();
  });

  test('toca o som do Toasty quando a TV recebe comando remoto', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));
    const { playMock } = mockAudio();
    mockLiveRankingAndToastySignal();

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();
    expect(playMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  test('aceita comando remoto com atraso de propagação do KV', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:01:30.000Z'));
    const { playMock } = mockAudio();
    mockLiveRankingAndToastySignal([
      {
        id: '0',
        triggeredAt: null,
      },
      {
        id: 'remote-1',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  test('exibe Denner como overlay global quando o pódio está expandido', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));
    mockLiveRankingAndToastySignal();

    const { container } = render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Expandir pódio Closers' }),
    );

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    const toasty = screen.getByLabelText('Denner Toasty');

    expect(toasty).toHaveClass('toasty-easter-egg--over-expanded');
    expect(container.querySelector('main .toasty-easter-egg')).toBeNull();
  });

  test('aciona comando remoto recente recebido no primeiro polling da TV', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:05.000Z'));
    mockLiveRankingAndToastySignal([
      {
        id: 'remote-quick',
        serverNow: '2026-05-27T12:00:05.000Z',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();
  });

  test('aciona Denner Rapaz remoto com áudio e placa Rapaz', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:05.000Z'));
    const { instances, playMock } = mockAudio();
    mockLiveRankingAndToastySignal([
      {
        effect: 'rapaz',
        id: 'remote-rapaz',
        serverNow: '2026-05-27T12:00:05.000Z',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Denner Rapaz')).toBeInTheDocument();
    expect(screen.getByText('RAPAZ!')).toBeInTheDocument();
    expect(screen.getByAltText('Denner')).toHaveAttribute(
      'src',
      '/easter-eggs/denner-toasty-tv-safe-20260611.png',
    );
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(instances[0]?.src).toBe('/easter-eggs/rapaz-xaropinho.mp3');
  });

  test('reutiliza o mesmo player de áudio ao alternar de Toasty para Rapaz', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:06.000Z'));
    const { instances, playMock } = mockAudio();
    mockLiveRankingAndToastySignal([
      {
        id: '0',
        triggeredAt: null,
      },
      {
        effect: 'toasty',
        id: 'remote-toasty',
        serverNow: '2026-05-27T12:00:06.000Z',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
      {
        effect: 'rapaz',
        id: 'remote-rapaz',
        serverNow: '2026-05-27T12:00:06.000Z',
        triggeredAt: '2026-05-27T12:00:05.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(playMock).toHaveBeenCalledTimes(2);
    expect(instances).toHaveLength(1);
    expect(instances[0]?.src).toBe('/easter-eggs/rapaz-xaropinho.mp3');
    expect(screen.getByLabelText('Denner Rapaz')).toBeInTheDocument();
  });

  test.each([
    {
      ariaLabel: 'Denner UUII',
      audioSrc: '/easter-eggs/rodrigo-faro-uuii.mp3',
      effect: 'uuii',
      label: 'UUII!',
    },
    {
      ariaLabel: 'Denner Ele Gosta',
      audioSrc: '/easter-eggs/rodrigo-faro-ele-gosta.mp3',
      effect: 'ele-gosta',
      label: 'ELE GOSTA!',
    },
    {
      ariaLabel: 'Denner Brasil Sil Sil',
      audioSrc: '/easter-eggs/jingle-goal-brasil-sil-sil.mp3',
      effect: 'brasil-sil-sil',
      label: 'BRASIL SIL SIL!',
    },
    {
      ariaLabel: 'Denner Música Brasil',
      audioSrc: '/easter-eggs/jingle-goal-brasil-musica.mp3',
      effect: 'musica-brasil',
      label: 'MÚSICA BRASIL!',
    },
  ])(
    'aciona Denner $label remoto com áudio e placa corretos',
    async ({ ariaLabel, audioSrc, effect, label }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-27T12:00:05.000Z'));
      const { instances, playMock } = mockAudio();
      const fetchMock = mockLiveRankingAndToastySignal([
        {
          effect,
          id: `remote-${effect}`,
          serverNow: '2026-05-27T12:00:05.000Z',
          triggeredAt: '2026-05-27T12:00:00.000Z',
        },
      ]);

      render(<App />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        vi.advanceTimersByTime(2_000);
        await Promise.resolve();
      });

      expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByAltText('Denner')).toHaveAttribute(
        'src',
        '/easter-eggs/denner-toasty-tv-safe-20260611.png',
      );
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes('/api/toasty?effects=1'),
        ),
      ).toBe(true);
      expect(playMock).toHaveBeenCalledTimes(1);
      expect(instances[0]?.src).toBe(audioSrc);
    },
  );

  test('mostra o Brasil Sil Sil somente até o trecho da fala', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:05.000Z'));
    mockLiveRankingAndToastySignal([
      {
        effect: 'brasil-sil-sil',
        id: 'remote-brasil-sil-sil',
        serverNow: '2026-05-27T12:00:05.000Z',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Denner Brasil Sil Sil')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3_900);
    });

    expect(screen.getByLabelText('Denner Brasil Sil Sil')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(
      screen.queryByLabelText('Denner Brasil Sil Sil'),
    ).not.toBeInTheDocument();
  });

  test('ignora comando remoto antigo recebido no primeiro polling da TV', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:30.000Z'));
    mockLiveRankingAndToastySignal([
      {
        id: 'remote-old',
        serverNow: '2026-05-27T12:00:30.000Z',
        triggeredAt: '2026-05-27T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();
  });

  test('usa o PNG transparente do Denner com caminho versionado', async () => {
    vi.useFakeTimers();

    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByAltText('Denner')).toHaveAttribute(
      'src',
      '/easter-eggs/denner-toasty-tv-safe-20260611.png',
    );
    expect(screen.getByAltText('Denner')).toHaveAttribute('loading', 'eager');
    expect(screen.getByAltText('Denner')).toHaveAttribute('decoding', 'sync');
  });

  test('precarrega a imagem do Denner assim que o ranking abre', () => {
    const { container } = render(
      <App initialRows={rows} initialPeriods={mayAprilPeriods} />,
    );
    const preloadImage = container.querySelector('.toasty-image-preload');

    expect(preloadImage).toHaveAttribute(
      'src',
      '/easter-eggs/denner-toasty-tv-safe-20260611.png',
    );
    expect(preloadImage).toHaveAttribute('aria-hidden', 'true');
  });

  test('exibe botão para ativar som quando o navegador bloqueia autoplay', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));
    const playMock = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Autoplay bloqueado.'))
      .mockResolvedValue(undefined);
    const { instances } = mockAudio(playMock);
    mockLiveRankingAndToastySignal();

    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    const enableSoundButton = screen.getByRole('button', {
      name: 'Ativar som do Toasty',
    });

    await act(async () => {
      fireEvent.click(enableSoundButton);
      await Promise.resolve();
    });

    expect(
      screen.queryByRole('button', { name: 'Ativar som do Toasty' }),
    ).not.toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(2);
    expect(instances[0]?.src).toBe('/easter-eggs/denner-toasty-v2.mp3');
  });

  test('envia comando remoto do Denner pela tela de controle', async () => {
    window.history.pushState({}, '', '/?control=toasty&key=controle-v4');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'remote-1' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 201,
      }),
    );
    const user = userEvent.setup();

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    await user.click(screen.getByRole('button', { name: 'Soltar Toasty' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/toasty');
    expect(String(fetchMock.mock.calls[0][0])).toContain('effect=toasty');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      cache: 'no-store',
      method: 'POST',
    });
    expect(
      (fetchMock.mock.calls[0][1]?.headers as Headers).get('x-toasty-key'),
    ).toBe('controle-v4');
    expect(
      await screen.findByText('Comando enviado. O Denner vai aparecer na TV.'),
    ).toBeInTheDocument();
  });

  test('envia comando remoto do Rapaz pela tela de controle', async () => {
    window.history.pushState({}, '', '/?control=toasty&key=controle-v4');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ effect: 'rapaz', id: 'remote-rapaz' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 201,
      }),
    );
    const user = userEvent.setup();

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    await user.click(screen.getByRole('button', { name: 'Soltar Rapaz' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('effect=rapaz');
    expect(
      await screen.findByText(
        'Comando enviado. O Denner Rapaz vai aparecer na TV.',
      ),
    ).toBeInTheDocument();
  });

  test.each([
    {
      button: 'Soltar UUII',
      effect: 'uuii',
      message: 'Comando enviado. O Denner UUII vai aparecer na TV.',
    },
    {
      button: 'Soltar Ele Gosta',
      effect: 'ele-gosta',
      message: 'Comando enviado. O Denner Ele Gosta vai aparecer na TV.',
    },
    {
      button: 'Soltar Brasil Sil Sil',
      effect: 'brasil-sil-sil',
      message: 'Comando enviado. O Denner Brasil Sil Sil vai aparecer na TV.',
    },
    {
      button: 'Soltar Música Brasil',
      effect: 'musica-brasil',
      message: 'Comando enviado. O Denner Música Brasil vai aparecer na TV.',
    },
  ])(
    'envia comando remoto $button pela tela de controle',
    async ({ button, effect, message }) => {
      window.history.pushState({}, '', '/?control=toasty&key=controle-v4');
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ effect, id: `remote-${effect}` }), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 201,
        }),
      );
      const user = userEvent.setup();

      vi.stubGlobal('fetch', fetchMock);

      render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

      await user.click(screen.getByRole('button', { name: button }));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`effect=${effect}`);
      expect(await screen.findByText(message)).toBeInTheDocument();
    },
  );

  test('renderiza bases de pódio com metais por posição', () => {
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    const closerPodium = screen.getByLabelText('Top 5 Closers');

    expect(
      within(closerPodium)
        .getByTestId('podium-closer-1')
        .querySelector('[data-podium-metal="gold"]'),
    ).not.toBeNull();
    expect(
      within(closerPodium)
        .getByTestId('podium-closer-2')
        .querySelector('[data-podium-metal="silver"]'),
    ).not.toBeNull();
    expect(
      within(closerPodium)
        .getByTestId('podium-closer-3')
        .querySelector('[data-podium-metal="bronze"]'),
    ).not.toBeNull();
  });

  test('permite alternar o destaque ativo no pódio', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    const closerPodium = screen.getByLabelText('Top 5 Closers');
    const firstButton = within(
      within(closerPodium).getByTestId('podium-closer-1'),
    ).getByRole('button');
    const secondButton = within(
      within(closerPodium).getByTestId('podium-closer-2'),
    ).getByRole('button');

    expect(firstButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(secondButton);

    expect(firstButton).toHaveAttribute('aria-pressed', 'false');
    expect(secondButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('expande o ranking de closers ao clicar na área do bloco', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    const closerPanel = screen.getByRole('region', { name: 'Closers' });

    await user.click(closerPanel);

    const expandedPanel = screen.getByRole('dialog', { name: 'Closers' });

    expect(expandedPanel).toHaveClass('is-expanded');
    expect(expandedPanel).toHaveAttribute('aria-modal', 'true');
    expect(
      within(expandedPanel).getByRole('button', {
        name: 'Fechar pódio Closers',
      }),
    ).toBeInTheDocument();
  });

  test('expande o ranking de SDRs pelo botão e fecha com escape', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={mayAprilPeriods} />);

    const sdrPanel = screen.getByRole('region', { name: 'SDR / Pré-vendas' });

    await user.click(
      within(sdrPanel).getByRole('button', {
        name: 'Expandir pódio SDR / Pré-vendas',
      }),
    );

    expect(
      screen.getByRole('dialog', { name: 'SDR / Pré-vendas' }),
    ).toHaveClass('is-expanded');

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: 'SDR / Pré-vendas' }),
    ).not.toBeInTheDocument();
  });
});
