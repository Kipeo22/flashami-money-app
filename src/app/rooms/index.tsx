import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { RoomCard } from '@/components/room-card';
import { ThemedText } from '@/components/themed-text';
import { AppBottomNav } from '@/components/ui/app-bottom-nav';
import { AppScreen } from '@/components/ui/app-screen';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import {
  fetchCurrentUserRooms,
  type RoomListItem,
} from '@/features/rooms/rooms-api';
import { useTheme } from '@/hooks/use-theme';

export default function RoomsScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userLabel =
    typeof user?.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : user?.email;

  const loadRooms = useCallback(async () => {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      const nextRooms = await fetchCurrentUserRooms(user);
      setRooms(nextRooms);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Roomを取得できませんでした。',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRooms();
    });
  }, [loadRooms]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadRooms();
  };

  const handleSignOut = async () => {
    setErrorMessage(null);

    try {
      await signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'ログアウトできませんでした。',
      );
    }
  };

  return (
    <AppScreen
      bottomNavigation={<AppBottomNav active="rooms" />}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      surface="gray"
    >
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Avatar label={userLabel} size={42} />
          <View style={styles.topActions}>
            <IconButton accessibilityLabel="Roomを検索" icon="search" />
            <IconButton
              accessibilityLabel="ログアウト"
              icon="logout"
              onPress={handleSignOut}
            />
            <IconButton
              accessibilityLabel="Roomを追加"
              icon="add"
              variant="primary"
            />
          </View>
        </View>

        <View style={styles.header}>
          <ThemedText type="title">参加中のroom</ThemedText>
        </View>

        {errorMessage && (
          <View
            style={[
              styles.messagePanel,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          </View>
        )}

        {isLoading ? (
          <View style={[styles.statePanel, { backgroundColor: theme.surface }]}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">
              Roomを取得しています。
            </ThemedText>
          </View>
        ) : rooms.length === 0 ? (
          <View style={[styles.statePanel, { backgroundColor: theme.surface }]}>
            <ThemedText type="headline">表示できるroomはありません</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptyText}
            >
              運営者がこのメールアドレスをroom_membersに登録すると表示されます。
            </ThemedText>
          </View>
        ) : (
          <View style={styles.roomList}>
            {rooms.map((item) => (
              <RoomCard
                item={item}
                key={item.membershipId}
                userLabel={userLabel}
              />
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
  },
  header: {
    paddingTop: Spacing.four,
  },
  messagePanel: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
  },
  statePanel: {
    alignItems: 'center',
    borderRadius: Radius.large,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 180,
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  roomList: {
    gap: Spacing.three,
  },
});
