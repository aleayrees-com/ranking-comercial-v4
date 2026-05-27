import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const textDecoder = new TextDecoder('ascii');
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const decodeAscii = (bytes: Uint8Array, start: number, end: number): string =>
  textDecoder.decode(bytes.subarray(start, end));

const readUint32LittleEndian = (bytes: Uint8Array, start: number): number =>
  bytes[start] |
  (bytes[start + 1] << 8) |
  (bytes[start + 2] << 16) |
  (bytes[start + 3] << 24);

const webpHasAlphaChannel = (bytes: Uint8Array): boolean => {
  if (
    bytes.length < 20 ||
    decodeAscii(bytes, 0, 4) !== 'RIFF' ||
    decodeAscii(bytes, 8, 12) !== 'WEBP'
  ) {
    return false;
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = decodeAscii(bytes, offset, offset + 4);
    const chunkSize = readUint32LittleEndian(bytes, offset + 4);
    const payloadOffset = offset + 8;

    if (payloadOffset + chunkSize > bytes.length) {
      return false;
    }

    if (chunkType === 'ALPH') {
      return true;
    }

    if (chunkType === 'VP8X') {
      const alphaFlag = 0x10;
      return (bytes[payloadOffset] & alphaFlag) === alphaFlag;
    }

    offset = payloadOffset + chunkSize + (chunkSize % 2);
  }

  return false;
};

describe('Toasty assets', () => {
  test('uses a transparent Denner cutout', () => {
    const assetPath = resolve(
      repoRoot,
      'public/easter-eggs/denner-toasty-v4.webp',
    );
    const bytes = readFileSync(assetPath);

    expect(webpHasAlphaChannel(bytes)).toBe(true);
  });
});
