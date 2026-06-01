import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppBottomNav } from '@/components/ui/app-bottom-nav';
import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { Badge } from '@/components/ui/badge';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import {
  fetchCurrentUserRoomDetail,
  formatRoomPeriod,
  type RoomDetail,
} from '@/features/rooms/rooms-api';
import { useTheme } from '@/hooks/use-theme';

const roleLabel = {
  admin: '運営者',
  member: '参加者',
} as const;

export default function RoomDetailScreen() {
  const theme = useTheme();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    if (!user || !roomId) {
      return;
    }

    setErrorMessage(null);

    try {
      const nextRoomDetail = await fetchCurrentUserRoomDetail(user, roomId);
      setRoomDetail(nextRoomDetail);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Roomを取得できませんでした。',
      );
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRoom();
    });
  }, [loadRoom]);

  return (
    <AppScreen
      bottomNavigation={<AppBottomNav active="rooms" />}
      surface="gray"
    >
      <View style={styles.content}>
        <Link href="/rooms" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.backLink,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon color={theme.primary} name="arrowLeft" size={16} />
            <ThemedText type="linkPrimary">Room一覧へ戻る</ThemedText>
          </Pressable>
        </Link>

        {isLoading ? (
          <View style={[styles.statePanel, { backgroundColor: theme.surface }]}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">
              Roomを確認しています。
            </ThemedText>
          </View>
        ) : errorMessage ? (
          <View style={[styles.statePanel, { backgroundColor: theme.surface }]}>
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : !roomDetail ? (
          <View style={[styles.statePanel, { backgroundColor: theme.surface }]}>
            <ThemedText type="headline">このroomは表示できません</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              ログイン中のメールアドレスがroom_membersに登録されていません。
            </ThemedText>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.heroCard,
                Shadow.card,
                { backgroundColor: theme.surface },
              ]}
            >
              <View style={styles.heroHeader}>
                <ThemedText type="title" style={styles.roomTitle}>
                  {roomDetail.room.name}
                </ThemedText>
                <Badge tone={roomDetail.role === 'admin' ? 'blue' : 'gray'}>
                  {roleLabel[roomDetail.role]}
                </Badge>
              </View>

              <View style={styles.periodRow}>
                <AppIcon
                  color={theme.textSecondary}
                  name="calendar"
                  size={16}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {formatRoomPeriod(roomDetail.room)}
                </ThemedText>
              </View>

              {roomDetail.room.description && (
                <ThemedText type="small" themeColor="textSecondary">
                  {roomDetail.room.description}
                </ThemedText>
              )}
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="支出件数"
                value={`${roomDetail.expenseCount}件`}
              />
              <StatCard
                label="参加状態"
                value={roomDetail.status === 'joined' ? '参加済み' : '招待中'}
              />
            </View>

            <View
              style={[styles.nextPanel, { backgroundColor: theme.surface }]}
            >
              <ThemedText type="headline">支出一覧は次のStepで追加</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                この画面は今後、支出登録、承認状況、精算メモを同じカード基準で拡張します。
              </ThemedText>
            </View>
          </>
        )}
      </View>
    </AppScreen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="headline">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  backLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 38,
  },
  statePanel: {
    alignItems: 'center',
    borderRadius: Radius.large,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 180,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  heroCard: {
    borderRadius: Radius.large,
    gap: Spacing.twoHalf,
    padding: Spacing.four,
  },
  heroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  roomTitle: {
    flex: 1,
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    borderRadius: Radius.large,
    flex: 1,
    gap: Spacing.one,
    minHeight: 92,
    padding: Spacing.three,
  },
  nextPanel: {
    borderRadius: Radius.large,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.68,
  },
});
