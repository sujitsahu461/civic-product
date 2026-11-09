import { API_PREFIX, REQUEST_TIMEOUT_MS } from '../constants';
import type { Tokens } from './types';

export class ApiError extends Error {
  status: number;
  /** True when no response arrived (offline, timeout, server unreachable). The outcome is unknown. */
  network: boolean;
  fields: Record<string, string>;
  constructor(message: string, status: number, network = false, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.network = network;
    this.fields = fields;
  }
}

/** Turns a Django REST error body into one readable message plus per-field messages. */
export function parseErrorBody(data: unknown, status: number): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (typeof data === 'string') {
    const looksLikeHtml = data.includes('<html') || data.includes('<!DOCTYPE');
    return { message: looksLikeHtml || data.length > 250 ? `Server error (${status}). Please try again.` : data, fields };
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === 'string') return { message: d.detail, fields };
    const parts: string[] = [];
    for (const [key, value] of Object.entries(d)) {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      if (key === 'non_field_errors') {
        parts.push(text);
      } else {
        fields[key] = text;
        parts.push(`${key.replace(/_/g, ' ')}: ${text}`);
      }
    }
    if (parts.length) return { message: parts.join(' | '), fields };
  }
  if (status === 429) return { message: 'Too many requests. Please wait a moment and try again.', fields };
  return { message: `Request failed (${status}).`, fields };
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | undefined>;
  /** Attach the access token (default true). Public calls still send it when present so the server can scope results. */
  auth?: boolean;
  /** Fail instead of refreshing and retrying when the token is rejected. */
  noRefresh?: boolean;
};

export type ClientDeps = {
  baseUrl: string;
  getTokens: () => Tokens | null;
  setTokens: (tokens: Tokens | null) => void | Promise<void>;
  onAuthLost?: () => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function createClient(deps: ClientDeps) {
  const base = deps.baseUrl + API_PREFIX;
  const doFetch = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let refreshing: Promise<boolean> | null = null;

  async function send(path: string, opts: Options, token: string | null): Promise<Response> {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (opts.form) {
      body = opts.form; // fetch sets the multipart boundary itself
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(url.toString(), { method: opts.method ?? 'GET', headers, body, signal: controller.signal });
    } catch (err) {
      const timedOut = (err as { name?: string })?.name === 'AbortError';
      throw new ApiError(timedOut ? 'The server took too long to respond.' : 'Cannot reach the server. Check your connection.', 0, true);
    } finally {
      clearTimeout(timer);
    }
  }

  /** One refresh at a time: parallel 401s share the same refresh request. */
  function refreshOnce(): Promise<boolean> {
    if (!refreshing) {
      refreshing = (async () => {
        const current = deps.getTokens();
        if (!current?.refresh) return false;
        try {
          const res = await send('/auth/refresh/', { method: 'POST', body: { refresh: current.refresh }, auth: false }, null);
          if (!res.ok) return false;
          const data = (await res.json()) as Partial<Tokens>;
          if (!data.access) return false;
          await deps.setTokens({ access: data.access, refresh: data.refresh ?? current.refresh });
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  async function request<T>(path: string, opts: Options = {}): Promise<T> {
    let res = await send(path, opts, deps.getTokens()?.access ?? null);
    if (res.status === 401 && opts.auth !== false && !opts.noRefresh && deps.getTokens()?.refresh) {
      if (await refreshOnce()) {
        res = await send(path, opts, deps.getTokens()?.access ?? null);
      } else {
        await deps.setTokens(null);
        deps.onAuthLost?.();
      }
    }
    if (res.status === 204 || res.status === 205) return undefined as T;
    let data: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const { message, fields } = parseErrorBody(data, res.status);
      throw new ApiError(message, res.status, false, fields);
    }
    return data as T;
  }

  return { request };
}

export type Client = ReturnType<typeof createClient>;
