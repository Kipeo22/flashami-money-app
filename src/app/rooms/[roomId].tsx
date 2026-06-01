import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import {
  fetchCurrentUserRoomDetail,
  formatRoomPeriod,
  type RoomDetail,
} from '@/features/rooms/rooms-api';

const roleLabel = {
  admin: '運営者',
  member: '参加者',
} as const;

export default function RoomDetailScreen() {
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
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <Link href="/rooms" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Room一覧へ戻る</ThemedText>
              </Pressable>
            </Link>

            {isLoading ? (
              <ThemedView type="backgroundElement" style={styles.loadingPanel}>
                <ActivityIndicator color="#0071e3" />
                <ThemedText type="small" themeColor="textSecondary">
                  Roomを確認しています。
                </ThemedText>
              </ThemedView>
            ) : errorMessage ? (
              <ThemedView type="backgroundElement" style={styles.messagePanel}>
                <ThemedText type="small" style={styles.errorText}>
                  {errorMessage}
                </ThemedText>
              </ThemedView>
            ) : !roomDetail ? (
              <ThemedView type="backgroundElement" style={styles.messagePanel}>
                <ThemedText type="smallBold">
                  このroomは表示できません
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ログイン中のメールアドレスがroom_membersに登録されていません。
                </ThemedText>
              </ThemedView>
            ) : (
              <>
                <ThemedView style={styles.header}>
                  <ThemedText type="subtitle">
                    {roomDetail.room.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {formatRoomPeriod(roomDetail.room)}
                  </ThemedText>
                  {roomDetail.room.description && (
                    <ThemedText>{roomDetail.room.description}</ThemedText>
                  )}
                </ThemedView>

                <ThemedView style={styles.statsRow}>
                  <ThemedView type="backgroundElement" style={styles.statBox}>
                    <ThemedText type="small" themeColor="textSecondary">
                      自分のロール
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {roleLabel[roomDetail.role]}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.statBox}>
                    <ThemedText type="small" themeColor="textSecondary">
                      支出件数
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {roomDetail.expenseCount} 件
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.statBox}>
                    <ThemedText type="small" themeColor="textSecondary">
                      参加状態
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {roomDetail.status === 'joined' ? '参加済み' : '招待中'}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <ThemedView type="backgroundElement" style={styles.nextPanel}>
                  <ThemedText type="smallBold">
                    次のStepで支出一覧を実装します
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    現時点ではroom選択後の遷移先として、参加状態と件数だけを表示します。
                  </ThemedText>
                </ThemedView>
              </>
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
    gap: Spacing.two,
  },
  loadingPanel: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.four,
  },
  messagePanel: {
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  errorText: {
    color: '#b42318',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statBox: {
    minWidth: 150,
    flex: 1,
    gap: Spacing.one,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  nextPanel: {
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
