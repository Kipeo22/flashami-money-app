import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { restoreSessionFromUrl } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const callbackUrl = Linking.useLinkingURL();
  const router = useRouter();
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeAuthCallback() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      if (!callbackUrl) {
        return;
      }

      try {
        const didRestoreSession = await restoreSessionFromUrl(callbackUrl);
        if (!active) {
          return;
        }

        router.replace(didRestoreSession ? '/' : '/login');
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'ログインリンクを確認できませんでした。',
        );
      }
    }

    completeAuthCallback();

    return () => {
      active = false;
    };
  }, [callbackUrl, router]);

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          type="backgroundElement"
          style={[styles.panel, { borderColor: theme.border }, Shadows.card]}
        >
          {error ? (
            <>
              <ThemedText type="subtitle" style={styles.centerText}>
                ログインできませんでした
              </ThemedText>
              <ThemedText
                type="default"
                themeColor="textSecondary"
                style={styles.centerText}
              >
                {error}
              </ThemedText>
            </>
          ) : (
            <>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="subtitle" style={styles.centerText}>
                ログインしています
              </ThemedText>
            </>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  panel: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 420),
    gap: Spacing.three,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
