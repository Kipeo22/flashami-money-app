import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeProps = {
  tone?: 'blue' | 'gray';
  children: string;
};

export function Badge({ children, tone = 'gray' }: BadgeProps) {
  const theme = useTheme();
  const isBlue = tone === 'blue';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isBlue
            ? theme.primarySoft
            : theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText
        type="captionBold"
        style={{ color: isBlue ? theme.primary : theme.textSecondary }}
      >
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.half,
  },
});
