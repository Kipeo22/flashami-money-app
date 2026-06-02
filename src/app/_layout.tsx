import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

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
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
