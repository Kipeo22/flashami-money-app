import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAuthRedirectUrl, sendMagicLink, verifyEmailOtp } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function redirectAuthenticatedUser() {
      if (!isSupabaseConfigured) {
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (active && data.user) {
        router.replace('/rooms');
      }
    }

    redirectAuthenticatedUser();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSendMagicLink = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await sendMagicLink(email);
      setFeedback(
        'メールリンクを送信しました。メール内のリンクを開くか、6桁コードを入力してください。',
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'メールリンクの送信に失敗しました。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await verifyEmailOtp(email, otp);
      router.replace('/rooms');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : '認証コードの確認に失敗しました。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {!isSupabaseConfigured ? (
            <ThemedView type="backgroundElement" style={styles.alert}>
              <ThemedText type="smallBold">Supabase が未設定です</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                `EXPO_PUBLIC_SUPABASE_URL` と
                `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定してください。
              </ThemedText>
            </ThemedView>
          ) : null}

          {feedback ? (
            <ThemedView type="backgroundElement" style={styles.alert}>
              <ThemedText type="smallBold">ログイン状況</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {feedback}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView type="backgroundElement" style={styles.form}>
            <ThemedText type="smallBold">メールアドレス</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
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
              disabled={isSubmitting || !isSupabaseConfigured}
              onPress={handleSendMagicLink}
              style={({ pressed }) => [
                styles.button,
                (isSubmitting || !isSupabaseConfigured) &&
                  styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.buttonText}>
                {isSubmitting ? '送信中...' : 'メールリンクを送信'}
              </ThemedText>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary">
              redirect: {getAuthRedirectUrl()}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.form}>
            <ThemedText type="smallBold">6桁コード</ThemedText>
            <TextInput
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={theme.textSecondary}
              value={otp}
              onChangeText={setOtp}
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
              disabled={isSubmitting || !isSupabaseConfigured}
              onPress={handleVerifyOtp}
              style={({ pressed }) => [
                styles.secondaryButton,
                (isSubmitting || !isSupabaseConfigured) &&
                  styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">コードでログイン</ThemedText>
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
  alert: {
    gap: Spacing.one,
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
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#a3a3a3',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.72,
  },
});
