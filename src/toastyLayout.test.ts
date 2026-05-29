import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('Toasty layout', () => {
  test('keeps the normal Toasty overlay inside the viewport', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const baseRule = css.match(/\.toasty-easter-egg\s*\{[^}]+\}/)?.[0] ?? '';
    const normalAnimation =
      css.match(/@keyframes toasty-pop\s*\{[\s\S]+?\n\}/)?.[0] ?? '';

    expect(baseRule).toContain('animation: toasty-pop-contained');
    expect(normalAnimation).not.toContain('translateX(108%)');
  });
});
