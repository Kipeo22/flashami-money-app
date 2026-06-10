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
import { useAppPreferences, type AppMode } from '@/lib/app-preferences';
import { signOut } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { appMode, setAppMode } = useAppPreferences();
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSavingMode, setIsSavingMode] = useState(false);

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

  const handleAppModeChange = async (mode: AppMode) => {
    setIsSavingMode(true);
    setFeedback(null);

    try {
      await setAppMode(mode);
    } catch {
      setFeedback('表示モードを保存できませんでした。');
    } finally {
      setIsSavingMode(false);
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

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }, Shadows.card]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">表示モード</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {isSavingMode ? '保存中' : '端末ごとに保存'}
                </ThemedText>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                参加者モードでは支出入力を優先し、Room一覧や承認画面を下部メニューに表示しません。
              </ThemedText>

              <View style={styles.modeOptions}>
                <ModeOption
                  description="開催中イベントの支出登録を最優先します。"
                  isSelected={appMode === 'participant'}
                  label="参加者"
                  onPress={() => handleAppModeChange('participant')}
                />
                <ModeOption
                  description="Room管理、承認、支出確認を表示します。"
                  isSelected={appMode === 'admin'}
                  label="管理者"
                  onPress={() => handleAppModeChange('admin')}
                />
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

function ModeOption({
  description,
  isSelected,
  label,
  onPress,
}: {
  description: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeOption,
        {
          backgroundColor: isSelected ? theme.primarySoft : theme.background,
          borderColor: isSelected ? theme.primary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.radio,
          {
            borderColor: isSelected ? theme.primary : theme.textDisabled,
          },
        ]}
      >
        {isSelected ? (
          <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />
        ) : null}
      </View>
      <View style={styles.modeOptionText}>
        <ThemedText
          type="smallBold"
          style={{ color: isSelected ? theme.primary : theme.text }}
        >
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
    </Pressable>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  screenTitle: {
    lineHeight: 41,
  },
  card: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  modeOptions: {
    gap: Spacing.two,
  },
  modeOption: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modeOptionText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 11,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    opacity: 0.62,
  },
});
