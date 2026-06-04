import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!data.user) {
        router.replace('/login');
        return;
      }

      setEmail(data.user.email ?? null);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setFeedback(null);

    try {
      await signOut();
      router.replace('/login');
    } catch {
      setFeedback(
        'ログアウトできませんでした。時間をおいて再度お試しください。',
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">設定</ThemedText>
              <ThemedText themeColor="textSecondary">
                アカウント情報とアプリ操作を管理します。
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">アカウント</ThemedText>
              </View>
              <View
                style={[
                  styles.accountRow,
                  { backgroundColor: theme.overBackground },
                ]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  ログイン中
                </ThemedText>
                <ThemedText type="smallBold">
                  {email ?? 'メールアドレスを取得中'}
                </ThemedText>
              </View>
            </ThemedView>

            {feedback ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">確認してください</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </ThemedView>
            ) : null}

            <Pressable
              disabled={isSigningOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.dangerButton,
                {
                  borderColor: theme.danger,
                  backgroundColor: isSigningOut
                    ? theme.backgroundSelected
                    : 'transparent',
                },
                pressed && !isSigningOut && styles.pressed,
              ]}
            >
              <ThemedText
                type="default"
                style={{
                  color: isSigningOut ? theme.textSecondary : theme.danger,
                  fontWeight: 'bold',
                }}
              >
                {isSigningOut ? 'ログアウト中...' : 'ログアウト'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
        <BottomNav />
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
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  accountRow: {
    gap: Spacing.one,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  dangerButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.72,
  },
});
