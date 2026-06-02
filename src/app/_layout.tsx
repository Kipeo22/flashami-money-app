import '@/global.css';

import * as Linking from 'expo-linking';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { restoreSessionFromUrl } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Flashami Money' }} />
        <Stack.Screen name="login" options={{ title: 'ログイン' }} />
        <Stack.Screen name="rooms/index" options={{ title: 'Room' }} />
        <Stack.Screen name="rooms/new" options={{ title: 'room作成' }} />
        <Stack.Screen
          name="rooms/[roomId]/members"
          options={{ title: '参加者' }}
        />
        <Stack.Screen
          name="rooms/[roomId]/expenses/new"
          options={{ title: '支出登録' }}
        />
        <Stack.Screen
          name="rooms/[roomId]/expenses/[expenseId]"
          options={{ title: '支出詳細' }}
        />
      </Stack>
      <AuthLinkHandler />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function AuthLinkHandler() {
  const url = Linking.useLinkingURL();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!url || !isSupabaseConfigured) {
        return;
      }

      try {
        const didRestoreSession = await restoreSessionFromUrl(url);
        if (active && didRestoreSession) {
          router.replace('/rooms');
        }
      } catch {
        // The login screen also reports authentication errors after explicit actions.
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [router, url]);

  return null;
}
