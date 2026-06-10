import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
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
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendMagicLink, verifyEmailOtp } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [submittingAction, setSubmittingAction] = useState<
    'link' | 'otp' | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canSendMagicLink = email.trim().length > 0 && submittingAction === null;
  const canVerifyOtp =
    email.trim().length > 0 &&
    otp.trim().length === 6 &&
    submittingAction === null;

  useEffect(() => {
    let active = true;

    async function redirectAuthenticatedUser() {
      if (!isSupabaseConfigured) {
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (active && data.user) {
        router.replace('/');
      }
    }

    redirectAuthenticatedUser();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSendMagicLink = async () => {
    setSubmittingAction('link');
    setFeedback(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          '現在ログインできません。時間をおいて再度お試しください。',
        );
      }

      const redirectUrl = await sendMagicLink(email);
      setFeedback(
        `メールを送信しました。メール内のリンクを開くか、認証コードを入力してください。${__DEV__ ? `\n\nRedirect URL:\n${redirectUrl}` : ''}`,
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'ログインメールを送信できませんでした。',
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleVerifyOtp = async () => {
    setSubmittingAction('otp');
    setFeedback(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          '現在ログインできません。時間をおいて再度お試しください。',
        );
      }

      await verifyEmailOtp(email, otp);
      router.replace('/');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'ログインできませんでした。',
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView type="backgroundElement" style={styles.container}>
            <ThemedView type="backgroundElement" style={styles.brand}>
              <ThemedText type="title" style={styles.appName}>
                Flashami Money
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.form, { borderColor: theme.border }, Shadows.card]}
            >
              <Field label="メールアドレス">
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
                      backgroundColor: theme.overBackground,
                    },
                  ]}
                />
              </Field>

              <Pressable
                disabled={!canSendMagicLink}
                onPress={handleSendMagicLink}
                style={({ pressed }) => [
                  styles.primaryButton,
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
                    color: !canSendMagicLink ? theme.textSecondary : '#ffffff',
                  }}
                >
                  {submittingAction === 'link'
                    ? '送信中...'
                    : 'ログインメールを送信'}
                </ThemedText>
              </Pressable>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <Field label="認証コード">
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
                      backgroundColor: theme.overBackground,
                    },
                  ]}
                />
              </Field>

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
                  {submittingAction === 'otp' ? 'ログイン中...' : 'ログイン'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            {feedback ? (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.feedback,
                  { borderColor: theme.border },
                  Shadows.card,
                ]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.five,
  },
  container: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 480),
    gap: Spacing.four,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  appName: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.four,
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: {
    height: 1,
  },
  feedback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.62,
  },
});
