import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const { authCallbackError, signInWithEmailLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setMessage(null);
    setIsSending(true);

    try {
      const redirectTo = await signInWithEmailLink(email);
      setMessage(
        `ログインリンクを送信しました。Supabase Auth の Redirect URLs に ${redirectTo} が登録されている必要があります。`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'ログインリンクを送信できませんでした。',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">ログイン</ThemedText>
              <ThemedText themeColor="textSecondary">
                参加登録済みのメールアドレスにログインリンクを送ります。
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.form}>
              <ThemedText type="smallBold">メールアドレス</ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSending && isSupabaseConfigured}
                inputMode="email"
                keyboardType="email-address"
                onChangeText={setEmail}
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
                value={email}
              />

              {!isSupabaseConfigured && (
                <ThemedText type="small" style={styles.errorText}>
                  EXPO_PUBLIC_SUPABASE_URL と
                  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定してください。
                </ThemedText>
              )}

              {(errorMessage || authCallbackError) && (
                <ThemedText type="small" style={styles.errorText}>
                  {errorMessage ?? authCallbackError}
                </ThemedText>
              )}

              {message && (
                <ThemedText type="small" themeColor="textSecondary">
                  {message}
                </ThemedText>
              )}

              <Pressable
                disabled={isSending || !isSupabaseConfigured}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.button,
                  (pressed || isSending || !isSupabaseConfigured) &&
                    styles.pressed,
                ]}
              >
                {isSending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    メールリンクを送信
                  </ThemedText>
                )}
              </Pressable>
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
  header: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 980,
    backgroundColor: '#0071e3',
  },
  buttonText: {
    color: '#ffffff',
  },
  errorText: {
    color: '#b42318',
  },
  pressed: {
    opacity: 0.72,
  },
});
