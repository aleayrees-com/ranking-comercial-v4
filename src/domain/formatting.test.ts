import { describe, expect, test } from 'vitest';
import { formatCurrency, formatInteger } from './formatting.js';

describe('formatting', () => {
  test('formats currency and integer metrics for pt-BR dashboards', () => {
    expect(formatCurrency(126699)).toBe('R$ 126.699,00');
    expect(formatInteger(29)).toBe('29');
  });
});
