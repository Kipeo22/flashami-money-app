import '@/global.css';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { restoreSessionFromUrl } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Flashami Money' }} />
        <Stack.Screen name="admin" options={{ title: 'やること' }} />
        <Stack.Screen name="admin/rooms" options={{ title: 'Room別タスク' }} />
        <Stack.Screen name="admin/reviews" options={{ title: '承認待ち' }} />
        <Stack.Screen name="admin/expenses" options={{ title: '支出詳細' }} />
        <Stack.Screen name="login" options={{ title: 'ログイン' }} />
        <Stack.Screen name="notifications" options={{ title: '通知' }} />
        <Stack.Screen name="account" options={{ title: 'アカウント' }} />
        <Stack.Screen name="rooms/index" options={{ title: 'イベント' }} />
        <Stack.Screen name="rooms/[roomId]" options={{ title: '支出一覧' }} />
        <Stack.Screen name="rooms/new" options={{ title: 'room作成' }} />
        <Stack.Screen
          name="rooms/[roomId]/members"
          options={{ title: 'メンバー' }}
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
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const handledUrls = new Set<string>();

    async function restoreSession(url: string | null) {
      if (!url || !isSupabaseConfigured) {
        return;
      }

      if (handledUrls.has(url)) {
        return;
      }

      handledUrls.add(url);

      try {
        const didRestoreSession = await restoreSessionFromUrl(url);
        if (active && didRestoreSession) {
          router.replace('/');
        }
      } catch {
        // The login screen also reports authentication errors after explicit actions.
      }
    }

    Linking.getInitialURL()
      .then((url) => restoreSession(url))
      .catch(() => {
        // If initial URL lookup fails, explicit login actions still work.
      });

    const subscription = Linking.addEventListener('url', (event) => {
      restoreSession(event.url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);

  return null;
}
