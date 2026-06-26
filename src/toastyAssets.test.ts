import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const textDecoder = new TextDecoder('ascii');
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const decodeAscii = (bytes: Uint8Array, start: number, end: number): string =>
  textDecoder.decode(bytes.subarray(start, end));

const pngHasAlphaChannel = (bytes: Uint8Array): boolean => {
  if (
    bytes.length < 26 ||
    bytes[0] !== 0x89 ||
    decodeAscii(bytes, 1, 4) !== 'PNG' ||
    decodeAscii(bytes, 12, 16) !== 'IHDR'
  ) {
    return false;
  }

  return bytes[25] === 4 || bytes[25] === 6;
};

describe('Toasty assets', () => {
  test('uses a transparent Denner cutout', () => {
    const assetPath = resolve(
      repoRoot,
      'public/easter-eggs/denner-toasty-tv-safe-20260611.png',
    );
    const bytes = readFileSync(assetPath);

    expect(pngHasAlphaChannel(bytes)).toBe(true);
  });

  test('includes Rapaz audio effect', () => {
    const assetPath = resolve(
      repoRoot,
      'public/easter-eggs/rapaz-xaropinho.mp3',
    );

    expect(existsSync(assetPath)).toBe(true);
    expect(readFileSync(assetPath).length).toBeGreaterThan(0);
  });

  test.each([
    'public/easter-eggs/jingle-goal-brasil-sil-sil.mp3',
    'public/easter-eggs/rodrigo-faro-uuii.mp3',
    'public/easter-eggs/rodrigo-faro-ele-gosta.mp3',
  ])('includes audio effect %s', (asset) => {
    const assetPath = resolve(repoRoot, asset);

    expect(existsSync(assetPath)).toBe(true);
    expect(readFileSync(assetPath).length).toBeGreaterThan(0);
  });
});
