import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('TV layout', () => {
  test('keeps both ranking panels side by side on TV-sized viewports without orientation detection', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const tvRule =
      css.match(/@media \(min-width: 520px\)[\s\S]+?(?=@media|$)/)?.[0] ?? '';

    expect(tvRule).toContain('.ranking-grid');
    expect(tvRule).not.toContain('orientation: landscape');
    expect(tvRule).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr))',
    );
  });

  test('uses compact tables when two rankings share a 720p TV row', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const tvRule =
      css.match(/@media \(min-width: 520px\)[\s\S]+?(?=@media|$)/)?.[0] ?? '';

    expect(tvRule).toContain('table');
    expect(tvRule).toContain('min-width: 0');
    expect(tvRule).toContain('td:first-child');
    expect(tvRule).toContain('width: 42px');
  });
});
