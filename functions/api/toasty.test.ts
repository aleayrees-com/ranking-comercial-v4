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
    const getPayload = (await getResponse.json()) as {
      readonly id: string;
      readonly serverNow: string;
    };

    expect(postResponse.status).toBe(201);
    expect(postPayload.id).not.toBe('0');
    expect(getPayload.id).toBe(postPayload.id);
    expect(Date.parse(getPayload.serverNow)).not.toBeNaN();
  });

  test('registra comando remoto do Rapaz pelo KV', async () => {
    const env = {
      TOASTY_KV: createKv(),
    };
    const request = new Request(
      'https://rank.v4alfradique.com/api/toasty?effect=rapaz',
      {
        method: 'POST',
      },
    );
    const getRequest = new Request(
      'https://rank.v4alfradique.com/api/toasty?effects=1',
    );

    const postResponse = await onRequestPost({ env, request });
    const postPayload = (await postResponse.json()) as {
      readonly effect: string;
      readonly id: string;
    };
    const getResponse = await onRequestGet({ env, request: getRequest });
    const getPayload = (await getResponse.json()) as {
      readonly effect: string;
      readonly id: string;
    };

    expect(postResponse.status).toBe(201);
    expect(postPayload.effect).toBe('rapaz');
    expect(getPayload).toMatchObject({
      effect: 'rapaz',
      id: postPayload.id,
    });
  });

  test.each(['uuii', 'ele-gosta'])(
    'registra comando remoto %s pelo KV',
    async (effect) => {
      const env = {
        TOASTY_KV: createKv(),
      };
      const request = new Request(
        `https://rank.v4alfradique.com/api/toasty?effect=${effect}`,
        {
          method: 'POST',
        },
      );
      const getRequest = new Request(
        'https://rank.v4alfradique.com/api/toasty?effects=1',
      );

      const postResponse = await onRequestPost({ env, request });
      const postPayload = (await postResponse.json()) as {
        readonly effect: string;
        readonly id: string;
      };
      const getResponse = await onRequestGet({ env, request: getRequest });
      const getPayload = (await getResponse.json()) as {
        readonly effect: string;
        readonly id: string;
      };

      expect(postResponse.status).toBe(201);
      expect(postPayload.effect).toBe(effect);
      expect(getPayload).toMatchObject({
        effect,
        id: postPayload.id,
      });
    },
  );

  test.each(['uuii', 'ele-gosta'])(
    'oculta comando %s para clientes antigos',
    async (effect) => {
      const env = {
        TOASTY_KV: createKv(),
      };
      const postRequest = new Request(
        `https://rank.v4alfradique.com/api/toasty?effect=${effect}`,
        {
          method: 'POST',
        },
      );
      const legacyRequest = new Request(
        'https://rank.v4alfradique.com/api/toasty?cachebust=1',
      );
      const supportedRequest = new Request(
        'https://rank.v4alfradique.com/api/toasty?effects=1&cachebust=1',
      );

      await onRequestPost({ env, request: postRequest });

      const legacyResponse = await onRequestGet({
        env,
        request: legacyRequest,
      });
      const legacyPayload = (await legacyResponse.json()) as {
        readonly effect: string;
        readonly id: string;
      };
      const supportedResponse = await onRequestGet({
        env,
        request: supportedRequest,
      });
      const supportedPayload = (await supportedResponse.json()) as {
        readonly effect: string;
        readonly id: string;
      };

      expect(legacyPayload).toMatchObject({
        effect: 'toasty',
        id: '0',
      });
      expect(supportedPayload).toMatchObject({
        effect,
      });
      expect(supportedPayload.id).not.toBe('0');
    },
  );

  test('informa health do binding KV sem disparar comando', async () => {
    const env = {
      TOASTY_KV: createKv(),
    };
    const request = new Request(
      'https://rank.v4alfradique.com/api/toasty?health=1',
    );

    const response = await onRequestGet({ env, request });
    const payload = (await response.json()) as {
      readonly hasKv: boolean;
      readonly signal: { readonly id: string; readonly serverNow: string };
    };

    expect(payload.hasKv).toBe(true);
    expect(typeof payload.signal.id).toBe('string');
    expect(Date.parse(payload.signal.serverNow)).not.toBeNaN();
  });

  test('reseta o último comando remoto sem criar novo disparo', async () => {
    const env = {
      TOASTY_KV: createKv(),
    };
    const postRequest = new Request(
      'https://rank.v4alfradique.com/api/toasty',
      {
        method: 'POST',
      },
    );
    const resetRequest = new Request(
      'https://rank.v4alfradique.com/api/toasty?reset=1',
      {
        method: 'POST',
      },
    );

    await onRequestPost({ env, request: postRequest });
    const resetResponse = await onRequestPost({ env, request: resetRequest });
    const resetPayload = (await resetResponse.json()) as {
      readonly effect: string;
      readonly id: string;
      readonly triggeredAt: string | null;
    };

    expect(resetResponse.status).toBe(200);
    expect(resetPayload).toEqual({
      effect: 'toasty',
      id: '0',
      triggeredAt: null,
    });
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
