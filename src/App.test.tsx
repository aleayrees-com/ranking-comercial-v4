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

function mockAudio(
  playMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
) {
  const instances: MockAudio[] = [];

  class MockAudio {
    currentTime = 0;
    pause = vi.fn();
    play = playMock;
    preload = '';
    readonly src: string;
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

function mockLiveRankingAndToastySignal(
  triggeredAt = '2026-05-27T12:00:00.000Z',
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/ranking')) {
      return Promise.resolve(
        new Response(JSON.stringify({ periodFilters: periods, rows }), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        }),
      );
    }

    if (url.includes('/api/toasty')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'remote-1',
            triggeredAt,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
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
        initialPeriods={periods}
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
      <App initialRows={rows} initialPeriods={periods} />,
    );

    expect(
      container.querySelector('img[src="/investors/14-lucas-moura.jpg"]'),
    ).not.toBeNull();
  });

  test('renderiza os nomes calculados no ranking de closers e SDRs', () => {
    render(<App initialRows={rows} initialPeriods={periods} />);

    expect(screen.getAllByText('Macedo Lucas Rodrigues')).not.toHaveLength(0);
    expect(screen.getAllByText('Wilson Junior')).not.toHaveLength(0);
    expect(screen.getAllByText('R$ 126.699')).not.toHaveLength(0);
    expect(screen.getAllByText('29 reuniões')).not.toHaveLength(0);
  });

  test('trocar o período recalcula o ranking exibido', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={periods} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abril/2026' }));

    expect(screen.getAllByText('Fora do Período')).not.toHaveLength(0);
    expect(
      screen.queryByText('Macedo Lucas Rodrigues'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Sem closers válidos')).toBeInTheDocument();
  });

  test('não renderiza painel separado de inconsistências operacionais', () => {
    render(<App initialRows={rows} initialPeriods={periods} />);

    expect(
      screen.queryByText('Inconsistências operacionais'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Closer Sem Receita')).not.toBeInTheDocument();
  });

  test('mostra estado vazio quando o período não tem linhas válidas', async () => {
    const user = userEvent.setup();
    render(<App initialRows={rows} initialPeriods={periods} />);

    await user.click(screen.getByRole('button', { name: 'Junho/2026' }));

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

    expect(
      screen.getByRole('button', { name: 'Maio/2026' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abril/2026' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Março/2026' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Junho/2026' }),
    ).not.toBeInTheDocument();
  });

  test('destaca o primeiro lugar do pódio conforme a diferença da métrica', () => {
    render(<App initialRows={rows} initialPeriods={periods} />);

    const closerPodium = screen.getByLabelText('Top 3 Closers');
    const firstPlace = within(closerPodium).getByTestId('podium-closer-1');
    const secondPlace = within(closerPodium).getByTestId('podium-closer-2');

    const firstHeight = Number.parseInt(
      firstPlace.style.getPropertyValue('--podium-height'),
      10,
    );
    const secondHeight = Number.parseInt(
      secondPlace.style.getPropertyValue('--podium-height'),
      10,
    );

    expect(firstHeight).toBeGreaterThan(secondHeight + 80);
    expect(firstPlace.querySelector('.lucide-crown')).not.toBeNull();
    expect(firstPlace.querySelector('.podium-v4-crown')).not.toBeNull();
    expect(secondPlace.querySelector('.podium-v4-crown')).toBeNull();
  });

  test('exibe Denner Toasty automaticamente a cada cinco minutos', async () => {
    vi.useFakeTimers();

    render(<App initialRows={rows} initialPeriods={periods} />);

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2_800);
    });

    expect(screen.queryByLabelText('Denner Toasty')).not.toBeInTheDocument();
  });

  test('exibe Denner automaticamente sem tocar som', async () => {
    vi.useFakeTimers();
    const { playMock } = mockAudio();

    render(<App initialRows={rows} initialPeriods={periods} />);

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

    expect(screen.getByLabelText('Denner Toasty')).toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  test('aceita comando remoto com atraso de propagação do KV', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:01:30.000Z'));
    const { playMock } = mockAudio();
    mockLiveRankingAndToastySignal('2026-05-27T12:00:00.000Z');

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
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  test('usa imagem versionada do Denner para evitar cache antigo', async () => {
    vi.useFakeTimers();

    render(<App initialRows={rows} initialPeriods={periods} />);

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByAltText('Denner')).toHaveAttribute(
      'src',
      '/easter-eggs/denner-toasty-v4.webp',
    );
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

    render(<App initialRows={rows} initialPeriods={periods} />);

    await user.click(screen.getByRole('button', { name: 'Acionar na TV' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/toasty');
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

  test('renderiza bases de pódio com metais por posição', () => {
    render(<App initialRows={rows} initialPeriods={periods} />);

    const closerPodium = screen.getByLabelText('Top 3 Closers');

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
    render(<App initialRows={rows} initialPeriods={periods} />);

    const closerPodium = screen.getByLabelText('Top 3 Closers');
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
    render(<App initialRows={rows} initialPeriods={periods} />);

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
    render(<App initialRows={rows} initialPeriods={periods} />);

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
