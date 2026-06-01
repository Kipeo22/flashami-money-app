import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getSupabaseClient,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  authCallbackError: string | null;
  signInWithEmailLink: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
};

type AuthParams = {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAuthParams(url: string): AuthParams {
  const normalizedUrl = url.includes('#')
    ? url.replace('#', url.includes('?') ? '&' : '?')
    : url;
  const parsedUrl = new URL(normalizedUrl);

  return {
    code: parsedUrl.searchParams.get('code') ?? undefined,
    accessToken: parsedUrl.searchParams.get('access_token') ?? undefined,
    refreshToken: parsedUrl.searchParams.get('refresh_token') ?? undefined,
    error: parsedUrl.searchParams.get('error') ?? undefined,
    errorDescription:
      parsedUrl.searchParams.get('error_description') ?? undefined,
  };
}

async function upsertCurrentProfile(session: Session | null) {
  if (!session?.user.email || !supabase) {
    return;
  }

  await supabase.from('profiles').upsert(
    {
      id: session.user.id,
      email: session.user.email.toLowerCase(),
      display_name:
        typeof session.user.user_metadata.display_name === 'string'
          ? session.user.user_metadata.display_name
          : null,
    },
    { onConflict: 'id' },
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(
    null,
  );
  const handledUrls = useRef(new Set<string>());
  const linkingUrl = Linking.useLinkingURL();

  const handleAuthUrl = useCallback(async (url: string) => {
    if (!isSupabaseConfigured || handledUrls.current.has(url)) {
      return;
    }

    let params: AuthParams;

    try {
      params = readAuthParams(url);
    } catch {
      return;
    }

    if (
      !params.code &&
      !(params.accessToken && params.refreshToken) &&
      !params.error
    ) {
      return;
    }

    handledUrls.current.add(url);
    setAuthCallbackError(null);

    if (params.error) {
      setAuthCallbackError(
        params.errorDescription ?? 'ログインリンクを確認できませんでした。',
      );
      return;
    }

    const client = getSupabaseClient();

    if (params.code) {
      const { data, error } = await client.auth.exchangeCodeForSession(
        params.code,
      );

      if (error) {
        setAuthCallbackError(error.message);
        return;
      }

      setSession(data.session);
      await upsertCurrentProfile(data.session);
      return;
    }

    if (params.accessToken && params.refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });

      if (error) {
        setAuthCallbackError(error.message);
        return;
      }

      setSession(data.session);
      await upsertCurrentProfile(data.session);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsLoading(false);
      void upsertCurrentProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      void upsertCurrentProfile(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (linkingUrl) {
      queueMicrotask(() => {
        void handleAuthUrl(linkingUrl);
      });
    }
  }, [handleAuthUrl, linkingUrl]);

  const signInWithEmailLink = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('メールアドレスを入力してください。');
    }

    const redirectTo = Linking.createURL('auth/callback');
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw error;
    }

    return redirectTo;
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      authCallbackError,
      signInWithEmailLink,
      signOut,
    }),
    [authCallbackError, isLoading, session, signInWithEmailLink, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
