import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
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
              <ThemedText type="title" style={styles.screenTitle}>
                設定
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                アカウント情報とアプリ操作を管理します。
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }, Shadows.card]}
            >
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.accountIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'person.fill',
                      android: 'person',
                      web: 'person',
                    }}
                    size={20}
                    tintColor={theme.primary}
                    fallback={
                      <Text style={{ color: theme.primary, fontWeight: '700' }}>
                        A
                      </Text>
                    }
                  />
                </View>
                <View style={styles.accountText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    ログイン中
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {email ?? 'メールアドレスを取得中'}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>

            {feedback ? (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.card,
                  { borderColor: theme.border },
                  Shadows.card,
                ]}
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
                styles.logoutRow,
                { backgroundColor: theme.backgroundElement },
                Shadows.card,
                pressed && !isSigningOut && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: 'logout',
                  web: 'logout',
                }}
                size={20}
                tintColor={isSigningOut ? theme.textSecondary : theme.danger}
                fallback={
                  <Text
                    style={{
                      color: isSigningOut ? theme.textSecondary : theme.danger,
                    }}
                  >
                    →
                  </Text>
                }
              />
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  screenTitle: {
    lineHeight: 40,
  },
  card: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  accountIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  accountText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  logoutRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
