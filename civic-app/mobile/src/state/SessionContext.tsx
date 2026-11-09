import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '../api/client';
import { API_URL } from '../config';
import { endpoints, Api } from '../api/endpoints';
import { secure } from '../api/storage';
import type { Tokens, User } from '../api/types';

const TOKEN_KEY = 'civicsetu.tokens';

type Session = {
  loading: boolean;
  tokens: Tokens | null;
  user: User | null;
  api: Api;
  signIn: (email: string, password: string, captchaKey: string, captchaCode: string) => Promise<void>;
  signUp: (p: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokensState] = useState<Tokens | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const tokensRef = useRef<Tokens | null>(null);

  const setTokens = useCallback(async (t: Tokens | null) => {
    tokensRef.current = t;
    setTokensState(t);
    if (t) await secure.set(TOKEN_KEY, JSON.stringify(t));
    else await secure.remove(TOKEN_KEY);
  }, []);

  const api = useMemo(
    () =>
      endpoints(
        createClient({
          baseUrl: API_URL,
          getTokens: () => tokensRef.current,
          setTokens,
          onAuthLost: () => setUser(null),
        }),
      ),
    [setTokens],
  );

  // Restore a saved session, then confirm it with the server.
  useEffect(() => {
    (async () => {
      try {
        const saved = await secure.get(TOKEN_KEY);
        if (saved) {
          const t = JSON.parse(saved) as Tokens;
          tokensRef.current = t;
          setTokensState(t);
          try {
            setUser(await api.me());
          } catch (e) {
            // A rejected session is cleared by the client; an unreachable server keeps it for next time.
            if (!(e as { network?: boolean }).network) await setTokens(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [api, setTokens]);

  const finish = async (res: { user: User; tokens: Tokens }) => {
    if (res.user.role !== 'CITIZEN') {
      throw new Error('This app is for citizens. Officers and administrators use the CivicSetu website.');
    }
    await setTokens(res.tokens);
    setUser(res.user);
  };

  const value: Session = {
    loading,
    tokens,
    user,
    api,
    signIn: async (email, password, key, code) => finish(await api.login(email.trim(), password, key, code)),
    signUp: async (p) => finish(await api.register({ ...p, email: p.email.trim() })),
    signOut: async () => {
      const refresh = tokensRef.current?.refresh;
      try {
        if (refresh) await api.logout(refresh);
      } catch {
        /* sign out locally even if the server cannot be reached */
      }
      await setTokens(null);
      setUser(null);
    },
    setUser,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
