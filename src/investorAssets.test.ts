import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('Investor assets', () => {
  test('keeps the updated Paula Cristina photo in high resolution', () => {
    const photo = readFileSync(
      resolve(
        repoRoot,
        'public/investors/39-paula-cristina-jesus-nunes-de-oliveira.png',
      ),
    );

    expect(photo.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(photo.readUInt32BE(16)).toBeGreaterThanOrEqual(1000);
    expect(photo.readUInt32BE(20)).toBeGreaterThanOrEqual(1000);
  });
});
