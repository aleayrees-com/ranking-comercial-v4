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

  test('keeps the normal podium compact without shrinking expanded mode', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');

    expect(css).toContain('padding: 116px 0 0');
    expect(css).toContain(
      '--podium-stage-min: clamp(150px, var(--podium-height, 156px), 175px)',
    );
    expect(css).toContain(
      '--podium-stage-min: clamp(215px, var(--podium-height, 156px), 230px)',
    );
    expect(css).toContain(
      '--podium-stage-min: clamp(175px, var(--podium-height, 156px), 195px)',
    );
    expect(css).toMatch(
      /\.podium-stage \{[\s\S]*?justify-content: flex-start;[\s\S]*?\}/,
    );
    expect(css).toMatch(
      /\.ranking-panel\.is-expanded \.podium-stage \{[\s\S]*?justify-content: center;[\s\S]*?\}/,
    );
    expect(css).toContain(
      ".ranking-panel.is-expanded .podium-item[data-position='1']",
    );
    expect(css).toContain('--podium-stage-min: clamp(520px, 70vh, 820px)');
  });
});
