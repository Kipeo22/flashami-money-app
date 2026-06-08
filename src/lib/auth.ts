import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { getSupabaseClient } from '@/lib/supabase';

const authCallbackPath = 'auth/callback';

export function getAuthRedirectUrl() {
  return Linking.createURL(authCallbackPath);
}

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('メールアドレスを入力してください。');
  }

  const redirectUrl = getAuthRedirectUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }

  return redirectUrl;
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();

  if (!normalizedEmail) {
    throw new Error('メールアドレスを入力してください。');
  }

  if (!/^\d{6}$/.test(normalizedToken)) {
    throw new Error('6桁の認証コードを入力してください。');
  }

  const otpTypes = ['email', 'signup'] as const;
  let lastError: unknown = null;

  for (const type of otpTypes) {
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type,
    });

    if (!error) {
      return;
    }

    lastError = error;
  }

  throw lastError;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function restoreSessionFromUrl(url: string) {
  const supabase = getSupabaseClient();
  const params = getAuthParams(url);
  const errorCode = params.get('error_code') ?? params.get('error');

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return true;
  }

  const tokenHash = params.get('token_hash');
  const type = params.get('type') ?? 'email';
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      throw error;
    }

    return true;
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return true;
  }

  return false;
}

function getAuthParams(url: string) {
  const params = new URLSearchParams();

  if (Platform.OS === 'web') {
    const parsedUrl = new URL(url);
    mergeParams(params, parsedUrl.searchParams);
    mergeParams(params, new URLSearchParams(parsedUrl.hash.replace(/^#/, '')));
    return params;
  }

  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');

  if (queryStart >= 0) {
    const queryEnd = hashStart >= 0 ? hashStart : undefined;
    mergeParams(
      params,
      new URLSearchParams(url.slice(queryStart + 1, queryEnd)),
    );
  }

  if (hashStart >= 0) {
    mergeParams(params, new URLSearchParams(url.slice(hashStart + 1)));
  }

  return params;
}

function mergeParams(target: URLSearchParams, source: URLSearchParams) {
  source.forEach((value, key) => target.set(key, value));
}
