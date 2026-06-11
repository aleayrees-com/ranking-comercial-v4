import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('TV layout', () => {
  test('keeps both ranking panels side by side on landscape TV viewports', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const landscapeRule =
      css.match(
        /@media \(orientation: landscape\) and \(min-width: 640px\)[\s\S]+?(?=@media|$)/,
      )?.[0] ?? '';

    expect(landscapeRule).toContain('.ranking-grid');
    expect(landscapeRule).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr))',
    );
  });

  test('uses compact tables when two rankings share a 720p TV row', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const landscapeRule =
      css.match(
        /@media \(orientation: landscape\) and \(min-width: 640px\)[\s\S]+?(?=@media|$)/,
      )?.[0] ?? '';

    expect(landscapeRule).toContain('table');
    expect(landscapeRule).toContain('min-width: 0');
    expect(landscapeRule).toContain('td:first-child');
    expect(landscapeRule).toContain('width: 42px');
  });
});
