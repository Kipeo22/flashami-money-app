import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
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
                イベントや旅行の支出を、roomごとに整理して集めるモバイルアプリです。
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statusPanel}>
              <ThemedText type="smallBold">Step 0 setup</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Supabase: {isSupabaseConfigured ? 'configured' : 'env required'}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.actions}>
              <Link href="/login" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    ログインへ
                  </ThemedText>
                </Pressable>
              </Link>
              <Link href="/rooms" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">Room一覧へ</ThemedText>
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
    fontSize: 42,
    lineHeight: 48,
  },
  lead: {
    maxWidth: 520,
  },
  statusPanel: {
    gap: Spacing.one,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderColor: '#a3a3a3',
  },
  pressed: {
    opacity: 0.72,
  },
});
