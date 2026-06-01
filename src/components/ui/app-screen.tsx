import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppScreenProps = {
  bottomNavigation?: ReactNode;
  centered?: boolean;
  children: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  surface?: 'white' | 'gray';
};

export function AppScreen({
  bottomNavigation,
  centered,
  children,
  refreshControl,
  surface = 'white',
}: AppScreenProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            surface === 'gray' ? theme.backgroundElement : theme.background,
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            centered && styles.centered,
            bottomNavigation ? styles.withBottomNavigation : null,
          ]}
          refreshControl={refreshControl}
        >
          <View style={styles.container}>{children}</View>
        </ScrollView>
      </SafeAreaView>
      {bottomNavigation}
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
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  centered: {
    justifyContent: 'center',
    paddingBottom: Spacing.five,
  },
  withBottomNavigation: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  container: {
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
});
