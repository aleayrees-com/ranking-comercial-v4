import { describe, expect, test } from 'vitest';
import {
  findInvestorProfile,
  getInvestorInitials,
  type InvestorProfile,
} from './investors.js';
import { investorProfiles } from '../data/investorProfiles.js';

const profiles: readonly InvestorProfile[] = [
  {
    id: 'lucas-macedo',
    name: 'Lucas Macedo',
    aliases: ['Macedo Lucas Rodrigues'],
    imagePath: '/investors/lucas-macedo.jpg',
    roleLabel: 'CLOSER',
    status: 'active',
  },
  {
    id: 'wilson-de-carvalho-junior',
    name: 'Wilson de Carvalho Junior',
    aliases: ['Wilson Junior'],
    imagePath: '/investors/wilson-de-carvalho-junior.jpg',
    roleLabel: 'SDR',
    status: 'active',
  },
];

describe('investors', () => {
  test('encontra perfil por alias normalizado', () => {
    expect(findInvestorProfile(profiles, 'Macedo Lucas Rodrigues')?.id).toBe(
      'lucas-macedo',
    );
    expect(findInvestorProfile(profiles, 'wilson junior')?.id).toBe(
      'wilson-de-carvalho-junior',
    );
  });

  test('calcula iniciais estáveis para fallback visual', () => {
    expect(getInvestorInitials('Wilson de Carvalho Junior')).toBe('WJ');
    expect(getInvestorInitials('')).toBe('IV');
  });

  test('resolve fotos locais dos novos nomes de SDR/BDR da planilha', () => {
    const sheetNames = [
      'Leticia de Oliveira',
      'Tiago Lavinas',
      'Caio Henrique',
      'Daniel Dias',
      'Joao Carlos',
      'Paula Cristina',
      'Raphaela Reis',
      'Vinicius Lopes',
      'Wendel de Araujo',
    ];

    expect(
      sheetNames.map((name) => ({
        name,
        imagePath: findInvestorProfile(investorProfiles, name)?.imagePath,
      })),
    ).toEqual(
      sheetNames.map((name) => ({
        name,
        imagePath: expect.stringMatching(/^\/investors\/.+\.(jpe?g|png)$/),
      })),
    );
  });
});
