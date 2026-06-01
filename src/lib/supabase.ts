import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  processLock,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type AuthStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

const webStorage: AuthStorage = {
  getItem(key) {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  });
}

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return supabase;
}
