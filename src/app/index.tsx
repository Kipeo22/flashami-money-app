import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.hero}>
              <ThemedText type="title" style={styles.title}>
                Flashami Money
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.lead}>
                イベントや旅行の支出登録、レシート管理、参加者別の確認を room
                ごとにまとめます。
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.statusPanel, { borderColor: theme.border }]}
            >
              <View style={styles.statusRow}>
                <ThemedText type="smallBold">接続状態</ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isSupabaseConfigured
                        ? theme.overBackground
                        : theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {isSupabaseConfigured ? '設定済み' : '設定が必要'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                最初に Room
                一覧を開き、未ログインの場合はログイン画面へ進みます。
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.actions}>
              <Link href="/rooms" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Room一覧を開く
                  </ThemedText>
                </Pressable>
              </Link>
              <Link href="/login" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    ログイン
                  </ThemedText>
                </Pressable>
              </Link>
              <Link href={'/rooms/new' as any} asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    room作成
                  </ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          </ThemedView>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  lead: {
    maxWidth: 520,
  },
  statusPanel: {
    gap: Spacing.two,
    borderRadius: Radius.control,
    borderWidth: 1,
    padding: Spacing.three,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
