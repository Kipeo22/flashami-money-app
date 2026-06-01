import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function RoomsScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Room</ThemedText>
            <ThemedText themeColor="textSecondary">
              ログイン後、参加しているイベントや旅行のroomがここに表示されます。
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.emptyState}>
            <ThemedText type="smallBold">
              表示できるroomはまだありません
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Step 3でSupabaseから参加roomを取得する画面に拡張します。
            </ThemedText>
          </ThemedView>

          <Link href="/login" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.buttonText}>
                ログインへ
              </ThemedText>
            </Pressable>
          </Link>
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
  emptyState: {
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.72,
  },
});
