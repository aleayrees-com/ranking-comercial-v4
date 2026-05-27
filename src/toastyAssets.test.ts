import { readFileSync } from 'node:fs';
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
      'public/easter-eggs/denner-toasty-wide-eyed.png',
    );
    const bytes = readFileSync(assetPath);

    expect(pngHasAlphaChannel(bytes)).toBe(true);
  });
});
