import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AppIcon } from '@/components/ui/app-icon';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { RoomListItem, formatRoomPeriod } from '@/features/rooms/rooms-api';
import { useTheme } from '@/hooks/use-theme';

const roleLabel = {
  admin: '運営者',
  member: '参加者',
} as const;

type RoomCardProps = {
  item: RoomListItem;
  userLabel?: string | null;
};

export function RoomCard({ item, userLabel }: RoomCardProps) {
  const theme = useTheme();
  const isAdmin = item.role === 'admin';
  const memberLabel = item.displayName ?? userLabel ?? item.room.name;

  return (
    <Link
      href={{
        pathname: '/rooms/[roomId]',
        params: { roomId: item.room.id },
      }}
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          styles.card,
          Shadow.card,
          { backgroundColor: theme.surface },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="headline" style={styles.title} numberOfLines={1}>
            {item.room.name}
          </ThemedText>
          <Badge tone={isAdmin ? 'blue' : 'gray'}>{roleLabel[item.role]}</Badge>
        </View>

        <View style={styles.periodRow}>
          <AppIcon color={theme.textSecondary} name="calendar" size={15} />
          <ThemedText type="small" themeColor="textSecondary">
            {formatRoomPeriod(item.room)}
          </ThemedText>
        </View>

        {item.room.description && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            style={styles.description}
          >
            {item.room.description}
          </ThemedText>
        )}

        <View style={[styles.divider, { backgroundColor: theme.separator }]} />

        <View style={styles.footer}>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <ThemedText type="caption" themeColor="textSecondary">
                支出
              </ThemedText>
              <ThemedText type="headline">{item.expenseCount}件</ThemedText>
            </View>
            <View style={styles.metric}>
              <ThemedText type="caption" themeColor="textSecondary">
                未確認
              </ThemedText>
              <ThemedText type="headline" themeColor="textTertiary">
                0件
              </ThemedText>
            </View>
          </View>

          <View style={styles.avatars}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={index > 0 && styles.avatarOverlap}>
                <Avatar
                  label={index === 0 ? memberLabel : item.room.name}
                  size={28}
                  toneIndex={index + (isAdmin ? 0 : 2)}
                />
              </View>
            ))}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  description: {
    marginTop: -Spacing.half,
  },
  divider: {
    height: 1,
    marginTop: Spacing.two,
  },
  footer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  metric: {
    gap: Spacing.half,
  },
  avatars: {
    flexDirection: 'row',
    paddingRight: Spacing.one,
  },
  avatarOverlap: {
    marginLeft: -Spacing.two,
  },
  pressed: {
    opacity: 0.74,
  },
});
