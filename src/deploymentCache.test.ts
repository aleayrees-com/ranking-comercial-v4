import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');

describe('Cloudflare asset cache', () => {
  test('não mantém respostas inválidas de assets no cache do navegador', () => {
    const headers = readFileSync(resolve(repoRoot, 'public/_headers'), 'utf8');
    const assetsRule =
      headers.match(/\/assets\/\*\s+Cache-Control:\s*([^\r\n]+)/)?.[1] ?? '';

    expect(assetsRule).toContain('no-store');
    expect(assetsRule).not.toContain('immutable');
  });
});
