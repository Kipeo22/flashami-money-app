import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function AuthCallbackScreen() {
  const theme = useTheme();
  const { authCallbackError } = useAuth();

  return (
    <AppScreen centered>
      <View style={styles.content}>
        {authCallbackError ? (
          <View style={[styles.panel, { backgroundColor: theme.surface }]}>
            <ThemedText type="subtitle" style={styles.centerText}>
              ログインできませんでした
            </ThemedText>
            <ThemedText style={[styles.centerText, { color: theme.danger }]}>
              {authCallbackError}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.panel, { backgroundColor: theme.surface }]}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">
              ログイン状態を確認しています。
            </ThemedText>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
  panel: {
    alignItems: 'center',
    borderRadius: Radius.large,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
