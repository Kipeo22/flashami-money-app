import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendMagicLink, verifyEmailOtp } from '@/lib/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mailSent, setMailSent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'link' | 'otp' | null>(null);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active && data.user) router.replace('/rooms');
      });
    return () => {
      active = false;
    };
  }, [router]);

  const sendLink = async () => {
    setSubmitting('link');
    setFeedback(null);
    try {
      if (!isSupabaseConfigured)
        throw new Error(
          '現在ログインできません。時間をおいて再度お試しください。',
        );
      await sendMagicLink(email);
      setMailSent(true);
      setFeedback(
        'メールを送信しました。リンクを開くか、6桁の認証コードを入力してください。',
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'ログインメールを送信できませんでした。',
      );
    } finally {
      setSubmitting(null);
    }
  };

  const verifyOtp = async () => {
    setSubmitting('otp');
    setFeedback(null);
    try {
      await verifyEmailOtp(email, otp);
      router.replace('/rooms');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : '認証コードを確認できませんでした。',
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.brand}>
              <View
                style={[styles.logo, { backgroundColor: theme.primarySoft }]}
              >
                <SymbolView
                  name={{
                    ios: 'wallet.bifold.fill',
                    android: 'account_balance_wallet',
                    web: 'account_balance_wallet',
                  }}
                  size={34}
                  tintColor={theme.primary}
                  fallback={
                    <Text style={{ color: theme.primary, fontSize: 28 }}>
                      ¥
                    </Text>
                  }
                />
              </View>
              <ThemedText type="title" style={styles.appName}>
                Flashami Money
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.tagline}>
                イベントや旅行の支出をスマートに管理
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  メールアドレス
                </ThemedText>
                <View
                  style={[
                    styles.inputShell,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'envelope',
                      android: 'mail_outline',
                      web: 'mail_outline',
                    }}
                    size={21}
                    tintColor={theme.textDisabled}
                    fallback={
                      <Text style={{ color: theme.textDisabled }}>✉</Text>
                    }
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="example@mail.com"
                    placeholderTextColor={theme.textDisabled}
                    style={[styles.input, { color: theme.text }]}
                    value={email}
                  />
                </View>
              </View>

              <PrimaryButton
                disabled={!email.trim() || submitting !== null}
                onPress={sendLink}
              >
                {submitting === 'link' ? '送信中…' : 'ログイン →'}
              </PrimaryButton>

              {mailSent ? (
                <View style={styles.otpSection}>
                  <ThemedText type="small" themeColor="textSecondary">
                    メールに届いた6桁のコード
                  </ThemedText>
                  <TextInput
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={setOtp}
                    placeholder="000000"
                    placeholderTextColor={theme.textDisabled}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: theme.overBackground,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={otp}
                  />
                  <Pressable
                    disabled={otp.length !== 6 || submitting !== null}
                    onPress={verifyOtp}
                  >
                    <ThemedText type="linkPrimary" style={styles.verifyLink}>
                      {submitting === 'otp'
                        ? '確認中…'
                        : '認証コードでログイン'}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}

              {feedback ? (
                <ThemedText
                  type="small"
                  themeColor={mailSent ? 'textSecondary' : 'danger'}
                  style={styles.feedback}
                >
                  {feedback}
                </ThemedText>
              ) : null}
            </View>

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.note}
            >
              登録済みのメールアドレスでログインしてください
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  appName: { fontSize: 28, lineHeight: 35, textAlign: 'center' },
  brand: { alignItems: 'center', gap: 10 },
  container: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 390),
    gap: 36,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  feedback: { textAlign: 'center' },
  field: { gap: 8 },
  form: { gap: 30 },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingLeft: 16,
  },
  logo: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  note: { textAlign: 'center' },
  otpInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
  },
  otpSection: { gap: 10 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  tagline: { maxWidth: 310, textAlign: 'center' },
  verifyLink: { textAlign: 'center' },
});
