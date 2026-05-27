interface ToastySignal {
  readonly id: string;
  readonly triggeredAt: string | null;
}

interface ToastyKvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface ToastyEnvironment {
  readonly RANKING_TOASTY_KV?: ToastyKvNamespace;
  readonly TOASTY_CONTROL_KEY?: string;
  readonly TOASTY_KV?: ToastyKvNamespace;
}

interface ToastyContext {
  readonly env?: ToastyEnvironment;
  readonly request: Request;
}

const DEFAULT_SIGNAL: ToastySignal = {
  id: '0',
  triggeredAt: null,
};
const TOASTY_STATE_KEY = 'ranking-toasty-state';
const TOASTY_CACHE_URL = 'https://ranking-comercial-v4.local/toasty-state';

let memorySignal: ToastySignal = DEFAULT_SIGNAL;

export async function onRequestGet({
  env,
  request,
}: ToastyContext): Promise<Response> {
  const signal = await readSignal(env);

  if (new URL(request.url).searchParams.get('health') === '1') {
    return jsonResponse({
      hasKv: getKv(env) !== null,
      signal,
    });
  }

  return jsonResponse(signal);
}

export async function onRequestPost(context: ToastyContext): Promise<Response> {
  const { env, request } = context;

  if (!isAuthorized(request, env)) {
    return jsonResponse({ message: 'Comando não autorizado.' }, 401);
  }

  if (new URL(request.url).searchParams.get('reset') === '1') {
    await writeSignal(DEFAULT_SIGNAL, env);

    return jsonResponse(DEFAULT_SIGNAL);
  }

  const signal: ToastySignal = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    triggeredAt: new Date().toISOString(),
  };

  await writeSignal(signal, env);

  return jsonResponse(signal, 201);
}

function getKv(env?: ToastyEnvironment): ToastyKvNamespace | null {
  return env?.TOASTY_KV ?? env?.RANKING_TOASTY_KV ?? null;
}

function isAuthorized(request: Request, env?: ToastyEnvironment): boolean {
  const requiredKey = env?.TOASTY_CONTROL_KEY?.trim();

  if (!requiredKey) {
    return true;
  }

  const url = new URL(request.url);
  const providedKey =
    request.headers.get('x-toasty-key') ?? url.searchParams.get('key');

  return providedKey === requiredKey;
}

async function readSignal(env?: ToastyEnvironment): Promise<ToastySignal> {
  const kvSignal = await readKvSignal(env);

  if (kvSignal) {
    memorySignal = kvSignal;
    return kvSignal;
  }

  const cachedSignal = await readCachedSignal();

  if (cachedSignal) {
    memorySignal = cachedSignal;
    return cachedSignal;
  }

  return memorySignal;
}

async function writeSignal(
  signal: ToastySignal,
  env?: ToastyEnvironment,
): Promise<void> {
  memorySignal = signal;

  await Promise.all([writeKvSignal(signal, env), writeCachedSignal(signal)]);
}

async function readKvSignal(
  env?: ToastyEnvironment,
): Promise<ToastySignal | null> {
  const kv = getKv(env);

  if (!kv) {
    return null;
  }

  const storedSignal = await kv.get(TOASTY_STATE_KEY);

  return parseSignal(storedSignal);
}

async function writeKvSignal(
  signal: ToastySignal,
  env?: ToastyEnvironment,
): Promise<void> {
  const kv = getKv(env);

  if (!kv) {
    return;
  }

  await kv.put(TOASTY_STATE_KEY, JSON.stringify(signal));
}

async function readCachedSignal(): Promise<ToastySignal | null> {
  const cache = getCloudflareCache();

  if (!cache) {
    return null;
  }

  const cachedResponse = await cache.match(TOASTY_CACHE_URL);

  if (!cachedResponse) {
    return null;
  }

  return parseSignal(await cachedResponse.text());
}

async function writeCachedSignal(signal: ToastySignal): Promise<void> {
  const cache = getCloudflareCache();

  if (!cache) {
    return;
  }

  await cache.put(
    TOASTY_CACHE_URL,
    new Response(JSON.stringify(signal), {
      headers: {
        'Cache-Control': 'max-age=3600',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }),
  );
}

function getCloudflareCache(): Cache | null {
  if (!('caches' in globalThis)) {
    return null;
  }

  const cacheStorage = caches as CacheStorage & {
    readonly default?: Cache;
  };

  return cacheStorage.default ?? null;
}

function parseSignal(rawSignal: string | null): ToastySignal | null {
  if (!rawSignal) {
    return null;
  }

  try {
    const signal = JSON.parse(rawSignal) as Partial<ToastySignal>;

    if (typeof signal.id !== 'string') {
      return null;
    }

    return {
      id: signal.id,
      triggeredAt:
        typeof signal.triggeredAt === 'string' ? signal.triggeredAt : null,
    };
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json; charset=utf-8',
    },
    status,
  });
}
