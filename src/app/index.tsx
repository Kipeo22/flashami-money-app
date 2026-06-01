import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { AppButton } from '@/components/ui/button';
import { AppScreen } from '@/components/ui/app-screen';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

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
            style={styles.lead}
          >
            イベントや旅行の支出を、roomごとに整理して集めるモバイルアプリです。
          </ThemedText>
        </View>

        <View style={[styles.statusPanel, { backgroundColor: theme.surface }]}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            Supabase
          </ThemedText>
          <ThemedText type="headline">
            {isSupabaseConfigured ? 'configured' : 'env required'}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <AppButton
            icon="arrowRight"
            label="ログインへ"
            onPress={() => router.push('/login')}
          />
          <AppButton
            label="Room一覧へ"
            onPress={() => router.push('/rooms')}
            variant="secondary"
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
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
  lead: {
    maxWidth: 340,
    textAlign: 'center',
  },
  statusPanel: {
    borderRadius: Radius.large,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
});
