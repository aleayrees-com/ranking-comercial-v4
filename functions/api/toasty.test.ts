import { describe, expect, test } from 'vitest';
import { onRequestGet, onRequestPost } from './toasty.js';

function createKv() {
  const store = new Map<string, string>();

  return {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    put: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
  };
}

describe('/api/toasty', () => {
  test('registra e lê o último comando remoto pelo KV', async () => {
    const env = {
      TOASTY_KV: createKv(),
    };
    const request = new Request('https://rank.v4alfradique.com/api/toasty', {
      method: 'POST',
    });

    const postResponse = await onRequestPost({ env, request });
    const postPayload = (await postResponse.json()) as { readonly id: string };
    const getResponse = await onRequestGet({ env, request });
    const getPayload = (await getResponse.json()) as { readonly id: string };

    expect(postResponse.status).toBe(201);
    expect(postPayload.id).not.toBe('0');
    expect(getPayload.id).toBe(postPayload.id);
  });

  test('exige chave quando o ambiente define TOASTY_CONTROL_KEY', async () => {
    const env = {
      TOASTY_CONTROL_KEY: 'segredo',
      TOASTY_KV: createKv(),
    };
    const request = new Request('https://rank.v4alfradique.com/api/toasty', {
      method: 'POST',
    });

    const response = await onRequestPost({ env, request });

    expect(response.status).toBe(401);
  });
});
