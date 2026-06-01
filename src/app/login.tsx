import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { AppButton } from '@/components/ui/button';
import { AppScreen } from '@/components/ui/app-screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Shadow, Spacing } from '@/constants/theme';
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
    <AppScreen centered>
      <View style={styles.content}>
        <View
          style={[
            styles.brandMark,
            Shadow.card,
            { backgroundColor: theme.primarySoft },
          ]}
        >
          <AppIcon color={theme.primary} name="wallet" size={34} />
        </View>

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Flashami Money
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textSecondary"
            style={styles.subtitle}
          >
            イベントや旅行の支出をスマートに管理
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSending && isSupabaseConfigured}
            icon="mail"
            inputMode="email"
            keyboardType="email-address"
            label="メールアドレス"
            onChangeText={setEmail}
            placeholder="example@mail.com"
            value={email}
          />

          {!isSupabaseConfigured && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              を設定してください。
            </ThemedText>
          )}

          {(errorMessage || authCallbackError) && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage ?? authCallbackError}
            </ThemedText>
          )}

          {message && (
            <ThemedText type="small" themeColor="textSecondary">
              {message}
            </ThemedText>
          )}

          <AppButton
            disabled={!isSupabaseConfigured}
            icon="arrowRight"
            isLoading={isSending}
            label="ログイン"
            onPress={handleSubmit}
          />
        </View>

        <ThemedText
          type="caption"
          themeColor="textSecondary"
          style={styles.footnote}
        >
          登録済みのメールアドレスでログインしてください
        </ThemedText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    gap: Spacing.five,
    width: '100%',
  },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: Radius.medium,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 280,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.four,
  },
  footnote: {
    textAlign: 'center',
  },
});
