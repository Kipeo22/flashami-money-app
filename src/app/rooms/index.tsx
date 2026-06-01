import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import {
  fetchCurrentUserRooms,
  formatRoomPeriod,
  type RoomListItem,
} from '@/features/rooms/rooms-api';

const roleLabel = {
  admin: '運営者',
  member: '参加者',
} as const;

export default function RoomsScreen() {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedView style={styles.titleBlock}>
                <ThemedText type="subtitle">Room</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {user?.email} で参加しているイベントや旅行です。
                </ThemedText>
              </ThemedView>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="linkPrimary">ログアウト</ThemedText>
              </Pressable>
            </ThemedView>

            {errorMessage && (
              <ThemedView type="backgroundElement" style={styles.messagePanel}>
                <ThemedText type="small" style={styles.errorText}>
                  {errorMessage}
                </ThemedText>
              </ThemedView>
            )}

            {isLoading ? (
              <ThemedView type="backgroundElement" style={styles.loadingPanel}>
                <ActivityIndicator color="#0071e3" />
                <ThemedText type="small" themeColor="textSecondary">
                  Roomを取得しています。
                </ThemedText>
              </ThemedView>
            ) : rooms.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyState}>
                <ThemedText type="smallBold">
                  表示できるroomはありません
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  運営者がこのメールアドレスをroom_membersに登録すると表示されます。
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={styles.roomList}>
                {rooms.map((item) => (
                  <Link
                    key={item.membershipId}
                    href={{
                      pathname: '/rooms/[roomId]',
                      params: { roomId: item.room.id },
                    }}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.roomCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedView style={styles.roomCardHeader}>
                        <ThemedText type="smallBold" style={styles.roomName}>
                          {item.room.name}
                        </ThemedText>
                        <ThemedView style={styles.badge}>
                          <ThemedText type="small" style={styles.badgeText}>
                            {roleLabel[item.role]}
                          </ThemedText>
                        </ThemedView>
                      </ThemedView>

                      {item.room.description && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.room.description}
                        </ThemedText>
                      )}

                      <ThemedView style={styles.roomMeta}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatRoomPeriod(item.room)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          支出 {item.expenseCount} 件
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  </Link>
                ))}
              </ThemedView>
            )}
          </ThemedView>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.two,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  messagePanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  errorText: {
    color: '#b42318',
  },
  loadingPanel: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.four,
  },
  emptyState: {
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  roomList: {
    gap: Spacing.three,
  },
  roomCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#d2d2d7',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: '#ffffff',
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  roomName: {
    flex: 1,
    color: '#1d1d1f',
    fontSize: 17,
  },
  badge: {
    borderRadius: 980,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: '#f5f5f7',
  },
  badgeText: {
    color: '#1d1d1f',
  },
  roomMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.72,
  },
});
