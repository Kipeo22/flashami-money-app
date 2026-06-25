import AsyncStorage from '@react-native-async-storage/async-storage';
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

const AVATAR_COLOR_STORAGE_KEY = 'flashami-money-app:avatar-color';
const avatarColors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff2d55'];

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [avatarColor, setAvatarColor] = useState(avatarColors[0]);
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      const [storedAvatarColor, userResult] = await Promise.all([
        AsyncStorage.getItem(AVATAR_COLOR_STORAGE_KEY),
        getSupabaseClient().auth.getUser(),
      ]);

      if (!active) {
        return;
      }

      if (storedAvatarColor && avatarColors.includes(storedAvatarColor)) {
        setAvatarColor(storedAvatarColor);
      }

      if (!userResult.data.user) {
        router.replace('/login');
        return;
      }

      setEmail(userResult.data.user.email ?? null);
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  const handleAvatarColorChange = async (color: string) => {
    setAvatarColor(color);
    await AsyncStorage.setItem(AVATAR_COLOR_STORAGE_KEY, color);
  };

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
                アカウント
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                プロフィールとログアウトを管理します。
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }, Shadows.card]}
            >
              <View style={styles.accountRow}>
                <View
                  style={[styles.accountIcon, { backgroundColor: avatarColor }]}
                >
                  <ThemedText type="smallBold" style={styles.avatarText}>
                    {getAccountInitial(email)}
                  </ThemedText>
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
                <ThemedText type="smallBold">アイコン</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {getAccountInitial(email)}
                </ThemedText>
              </View>
              <View style={styles.iconPreviewRow}>
                <View
                  style={[
                    styles.largeAccountIcon,
                    { backgroundColor: avatarColor },
                  ]}
                >
                  <ThemedText type="title" style={styles.avatarText}>
                    {getAccountInitial(email)}
                  </ThemedText>
                </View>
                <View style={styles.accountText}>
                  <ThemedText type="smallBold">カラー</ThemedText>
                  <View style={styles.colorRow}>
                    {avatarColors.map((color) => {
                      const isSelected = color === avatarColor;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={color}
                          onPress={() => handleAvatarColorChange(color)}
                          style={({ pressed }) => [
                            styles.colorSwatch,
                            {
                              backgroundColor: color,
                              borderColor: isSelected
                                ? theme.text
                                : theme.backgroundElement,
                            },
                            pressed && styles.pressed,
                          ]}
                        />
                      );
                    })}
                  </View>
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

function getAccountInitial(email: string | null) {
  return email?.trim().slice(0, 1).toUpperCase() || 'A';
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
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  accountText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  iconPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  largeAccountIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderWidth: 3,
    borderRadius: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
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
