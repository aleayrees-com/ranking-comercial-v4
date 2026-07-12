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

  test('uses a compact Toasty overlay on short 720p TV viewports', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const shortTvRule =
      css.match(/@media \(max-height: 720px\)[\s\S]+?(?=@media|$)/)?.[0] ?? '';

    expect(shortTvRule).toContain('.toasty-easter-egg');
    expect(shortTvRule).not.toContain('orientation: landscape');
    expect(shortTvRule).toContain('width: clamp(150px, 24vw, 240px)');
    expect(shortTvRule).toContain('right: clamp(14px, 4vw, 48px)');
    expect(shortTvRule).toContain('bottom: clamp(12px, 4dvh, 36px)');
  });

  test('keeps the expanded podium centered without overlapping the table on short TVs', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');

    expect(css).toContain('grid-column: var(--podium-order)');
    expect(css).toContain('padding-top: clamp(126px, 18vh, 172px)');
  });

  test('emphasizes the primary podium number over its label', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const numberRule =
      css.match(/\.podium-metric-number\s*\{[^}]+\}/)?.[0] ?? '';
    const labelRule = css.match(/\.podium-metric-label\s*\{[^}]+\}/)?.[0] ?? '';

    expect(numberRule).toContain('font-size: 1.25em');
    expect(numberRule).toContain('font-weight: 900');
    expect(labelRule).toContain('font-size: 0.78em');
    expect(css).toContain('.ranking-panel.is-expanded .podium-metric-number');
    expect(css).toContain('font-size: 1.42em');
  });

  test('lowers the Carlos Guerra photo inside the podium frame', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const carlosPhotoRule =
      css.match(
        /\.podium-card-top\s*>\s*img\.investor-image\[src='\/investors\/04-carlos-guerra-v2\.png'\]\s*\{[^}]+\}/,
      )?.[0] ?? '';

    expect(carlosPhotoRule).toContain('object-position: 50% 35%');
  });

  test('floats the leader crown and lifts podium content away from the base', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const crownRule = css.match(/\.podium-v4-crown\s*\{[^}]+\}/)?.[0] ?? '';
    const podiumStageRule = css.match(/\.podium-stage\s*\{[^}]+\}/)?.[0] ?? '';

    expect(crownRule).toContain('animation: podium-crown-float');
    expect(css).toContain('@keyframes podium-crown-float');
    expect(podiumStageRule).toContain('justify-content: flex-start');
  });

  test('avoids CSS filters on the Denner image for TV browser compatibility', () => {
    const css = readFileSync(resolve(repoRoot, 'src/styles.css'), 'utf8');
    const imageRule =
      css.match(/\.toasty-easter-egg img\s*\{[^}]+\}/)?.[0] ?? '';

    expect(imageRule).not.toContain('filter:');
  });
});
