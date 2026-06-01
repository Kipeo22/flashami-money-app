import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

export default function AuthCallbackScreen() {
  const { authCallbackError } = useAuth();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          {authCallbackError ? (
            <>
              <ThemedText type="subtitle">ログインできませんでした</ThemedText>
              <ThemedText style={styles.errorText}>
                {authCallbackError}
              </ThemedText>
            </>
          ) : (
            <>
              <ActivityIndicator color="#0071e3" />
              <ThemedText type="small" themeColor="textSecondary">
                ログイン状態を確認しています。
              </ThemedText>
            </>
          )}
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
    justifyContent: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.three,
  },
  errorText: {
    color: '#b42318',
    textAlign: 'center',
  },
});
