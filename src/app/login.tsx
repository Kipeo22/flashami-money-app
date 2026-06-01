import { Link } from 'expo-router';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">ログイン</ThemedText>
            <ThemedText themeColor="textSecondary">
              参加登録済みのメールアドレスでroomにアクセスします。
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.form}>
            <ThemedText type="smallBold">メールアドレス</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                  backgroundColor: theme.background,
                },
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.buttonText}>
                メールリンクを送信
              </ThemedText>
            </Pressable>
          </ThemedView>

          <Link href="/" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="linkPrimary">ホームへ戻る</ThemedText>
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
  form: {
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.72,
  },
});
