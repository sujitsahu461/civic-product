import { describe, expect, it, vi } from 'vitest';
import { ApiError, createClient, parseErrorBody } from './client';
import type { Tokens } from './types';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function setup(fetchImpl: typeof fetch, tokens: Tokens | null = { access: 'old', refresh: 'r1' }, timeoutMs = 1000) {
  let current = tokens;
  const onAuthLost = vi.fn();
  const client = createClient({
    baseUrl: 'http://api.test', fetchImpl, timeoutMs, onAuthLost,
    getTokens: () => current,
    setTokens: (t) => { current = t; },
  });
  return { client, onAuthLost, get tokens() { return current; } };
}

describe('parseErrorBody', () => {
  it('uses detail, field errors and hides HTML', () => {
    expect(parseErrorBody({ detail: 'Nope' }, 400).message).toBe('Nope');
    const f = parseErrorBody({ email: ['Already used.'], non_field_errors: ['Bad login.'] }, 400);
    expect(f.fields.email).toBe('Already used.');
    expect(f.message).toContain('Bad login.');
    expect(parseErrorBody('<html>boom</html>', 500).message).toContain('Server error');
  });
});

describe('client', () => {
  it('sends the bearer token and JSON body', async () => {
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    const { client } = setup(fetchMock as unknown as typeof fetch);
    await client.request('/x/', { method: 'POST', body: { a: 1 } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/x/');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer old');
    expect(init.body).toBe('{"a":1}');
  });

  it('refreshes once for several parallel 401s and retries each call', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh/')) {
        refreshCalls += 1;
        return json(200, { access: 'new', refresh: 'r2' });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer new' ? json(200, { ok: true }) : json(401, { detail: 'expired' });
    });
    const t = setup(fetchMock as unknown as typeof fetch);
    const results = await Promise.all([t.client.request('/a/'), t.client.request('/b/'), t.client.request('/c/')]);
    expect(results).toHaveLength(3);
    expect(refreshCalls).toBe(1);
    expect(t.tokens).toEqual({ access: 'new', refresh: 'r2' });
  });

  it('signs out when the refresh token is rejected', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/auth/refresh/') ? json(400, { detail: 'invalid' }) : json(401, { detail: 'expired' }));
    const t = setup(fetchMock as unknown as typeof fetch);
    await expect(t.client.request('/a/')).rejects.toMatchObject({ status: 401 });
    expect(t.tokens).toBeNull();
    expect(t.onAuthLost).toHaveBeenCalledOnce();
  });

  it('reports an unreachable server as a network error', async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('failed'); });
    const { client } = setup(fetchMock as unknown as typeof fetch);
    const err = (await client.request('/a/').catch((e) => e)) as ApiError;
    expect(err.network).toBe(true);
    expect(err.status).toBe(0);
  });

  it('times out slow requests as a network error', async () => {
    const fetchMock = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const { client } = setup(fetchMock as unknown as typeof fetch, null, 30);
    const err = (await client.request('/slow/').catch((e) => e)) as ApiError;
    expect(err.network).toBe(true);
    expect(err.message).toContain('too long');
  });

  it('does not treat an HTTP error as a network error', async () => {
    const fetchMock = vi.fn(async () => json(400, { title: ['Required.'] }));
    const { client } = setup(fetchMock as unknown as typeof fetch);
    const err = (await client.request('/a/', { method: 'POST', body: {} }).catch((e) => e)) as ApiError;
    expect(err.network).toBe(false);
    expect(err.fields.title).toBe('Required.');
  });
});
