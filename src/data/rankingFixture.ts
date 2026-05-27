import type { PeriodFilter } from '../domain/ranking.js';
import {
  normalizeLocalRows,
  type LocalRankingSourceRow,
} from '../domain/normalization.js';

export const sourceSpreadsheet = {
  title: 'Cópia de Controle de Resultados | Alfradique & Co RJ',
  url: 'https://docs.google.com/spreadsheets/d/1iVyJSFP6n_We9TMxFU0xHtcXnAFl6U-0Sgh3StCiqkc/edit?gid=839739381#gid=839739381',
  sheet: 'LEAD BROKER / CDR MAIO/26',
  timezone: 'America/Sao_Paulo',
} as const;

export const periodFilters: readonly PeriodFilter[] = [
  {
    label: 'Maio/2026',
    start: '2026-05-01',
    end: '2026-05-31',
  },
];

export const localSourceRows: readonly LocalRankingSourceRow[] = [
  {
    period: '2026-05-31',
    role: 'closer',
    memberId: 'carlos-guerra',
    memberName: 'Carlos Guerra',
    revenue: 0,
    logos: 0,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-31',
    role: 'closer',
    memberId: 'lucas-macedo',
    memberName: 'Lucas Macedo',
    revenue: 126698.52,
    logos: 7,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-31',
    role: 'closer',
    memberId: 'miguel-de-oliveira-guimaraes-vieira',
    memberName: 'Miguel de Oliveira Guimarães Vieira',
    revenue: 17984,
    logos: 1,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-31',
    role: 'sdr',
    memberId: 'wilson-de-carvalho-junior',
    memberName: 'Wilson Junior',
    meetingsHeld: 19,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-31',
    role: 'sdr',
    memberId: 'lucas-moura',
    memberName: 'Lucas Moura',
    meetingsHeld: 15,
    sourceChannel: 'Lead Broker',
  },
  {
    period: '2026-05-31',
    role: 'sdr',
    memberId: 'lucas-macedo',
    memberName: 'Lucas Macedo',
    meetingsHeld: 1,
    sourceChannel: 'Lead Broker',
  },
];

export const rankingRows = normalizeLocalRows(localSourceRows);
