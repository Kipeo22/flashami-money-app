import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function RoomsScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">Room</ThemedText>
              <ThemedText themeColor="textSecondary">
                roomの作成と参加者管理をここから始めます。
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <ThemedText type="smallBold">まだroomは登録されていません</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                まずはroomを作成して、参加者のメールアドレスを追加してください。
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.actions}>
              <Link href={'/rooms/new' as any} asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    roomを作成する
                  </ThemedText>
                </Pressable>
              </Link>

              <Link href="/login" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">ログインへ</ThemedText>
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
    alignItems: 'center',
    padding: Spacing.four,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  actions: {
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderColor: '#a3a3a3',
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.72,
  },
});
