import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendMagicLink, verifyEmailOtp } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canSendMagicLink =
    email.trim().length > 0 && !isSubmitting && isSupabaseConfigured;
  const canVerifyOtp =
    email.trim().length > 0 &&
    otp.trim().length === 6 &&
    !isSubmitting &&
    isSupabaseConfigured;

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">ログイン</ThemedText>
              <ThemedText themeColor="textSecondary">
                参加登録済みのメールアドレスで room にアクセスします。
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

            <ThemedView
              type="backgroundElement"
              style={[styles.form, { borderColor: theme.border }]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">
                  1. メールアドレスを入力
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  マジックリンクを受信
                </ThemedText>
              </View>
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
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              <Pressable
                disabled={!canSendMagicLink}
                onPress={handleSendMagicLink}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: !canSendMagicLink
                      ? theme.backgroundSelected
                      : theme.primary,
                  },
                  pressed && canSendMagicLink && styles.pressed,
                ]}
              >
                <ThemedText
                  type="default"
                  style={{
                    fontWeight: 'bold',
                    color: !canSendMagicLink
                      ? theme.textSecondary
                      : theme.primaryText,
                  }}
                >
                  {isSubmitting ? '送信中...' : 'メールリンクを送信'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.form, { borderColor: theme.border }]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">2. 確認コードを入力</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  メール内にある6桁
                </ThemedText>
              </View>
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
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              <Pressable
                disabled={!canVerifyOtp}
                onPress={handleVerifyOtp}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: canVerifyOtp ? theme.primary : theme.border,
                    backgroundColor: !canVerifyOtp
                      ? theme.backgroundSelected
                      : 'transparent',
                  },
                  pressed && canVerifyOtp && styles.pressed,
                ]}
              >
                <ThemedText
                  type="default"
                  style={{
                    fontWeight: 'bold',
                    color: !canVerifyOtp ? theme.textSecondary : theme.primary,
                  }}
                >
                  確認コードを使ってログイン
                </ThemedText>
              </Pressable>
            </ThemedView>

            <Link href="/" asChild>
              <Pressable
                style={({ pressed }) => [
                  pressed && styles.pressed,
                  { padding: Spacing.two },
                ]}
              >
                <ThemedText type="linkPrimary">← ホームへ戻る</ThemedText>
              </Pressable>
            </Link>
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
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  alert: {
    gap: Spacing.one,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
