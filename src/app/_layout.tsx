import '@/global.css';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthenticatedStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthenticatedStack() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) {
      return;
    }

    const firstSegment = segments[0];
    const isAuthRoute = firstSegment === 'login' || firstSegment === 'auth';

    if (!session && !isAuthRoute) {
      router.replace('/login');
      return;
    }

    if (session && isAuthRoute) {
      router.replace('/rooms');
    }
  }, [isLoading, rootNavigationState?.key, router, segments, session]);

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Flashami Money' }} />
        <Stack.Screen name="login" options={{ title: 'ログイン' }} />
        <Stack.Screen
          name="auth/callback"
          options={{ title: 'ログイン確認' }}
        />
        <Stack.Screen name="rooms/index" options={{ title: 'Room' }} />
        <Stack.Screen name="rooms/[roomId]" options={{ title: 'Room詳細' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
