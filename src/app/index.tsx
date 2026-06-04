import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rooms, setRooms] = useState<UserRoomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const activeRooms = useMemo(
    () => rooms.filter((room) => isRoomActive(room, todayIso)),
    [rooms, todayIso],
  );
  const nextRoom = useMemo(
    () =>
      rooms.find(
        (room) => room.start_date !== null && room.start_date > todayIso,
      ) ?? null,
    [rooms, todayIso],
  );

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const roomData = await fetchCurrentUserRooms();
        if (active) {
          setRooms(roomData);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'イベントの取得に失敗しました。';

        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }

        setError(
          'イベントを表示できませんでした。時間をおいて再度お試しください。',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      active = false;
    };
  }, [router]);

  const primaryRoom = activeRooms[0] ?? null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Flashami Money
              </ThemedText>
              <ThemedText type="subtitle">開催中のイベント</ThemedText>
              <ThemedText themeColor="textSecondary">
                今日使う room を選ぶと、そのまま支出を登録できます。
              </ThemedText>
            </ThemedView>

            {primaryRoom ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.featureCard, { borderColor: theme.primary }]}
              >
                <View style={styles.featureHeader}>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="small" themeColor="textSecondary">
                      すぐ入力
                    </ThemedText>
                    <ThemedText type="subtitle" style={styles.featureTitle}>
                      {primaryRoom.name}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      開催中
                    </ThemedText>
                  </View>
                </View>

                <ThemedText themeColor="textSecondary">
                  {primaryRoom.description || '支出登録を開始できます。'}
                </ThemedText>

                <View
                  style={[
                    styles.metaRow,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <Meta label="期間" value={formatRoomPeriod(primaryRoom)} />
                  <Meta
                    label="支出件数"
                    value={`${primaryRoom.expense_count}件`}
                  />
                </View>

                <Pressable
                  onPress={() =>
                    router.push(
                      `/rooms/${primaryRoom.id}/expenses/new` as never,
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="default" style={styles.primaryButtonText}>
                    支出を登録する
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}

            {activeRooms.length > 1 ? (
              <ThemedView style={styles.section}>
                <ThemedText type="smallBold">ほかの開催中 room</ThemedText>
                <View style={styles.roomList}>
                  {activeRooms.slice(1).map((room) => (
                    <RoomRow key={room.id} room={room} />
                  ))}
                </View>
              </ThemedView>
            ) : null}

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  参加中のイベントを確認しています。
                </ThemedText>
              </ThemedView>
            ) : null}

            {error ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">表示できませんでした</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            {!isLoading && !error && activeRooms.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.emptyCard, { borderColor: theme.border }]}
              >
                <ThemedText type="default" style={styles.emptyTitle}>
                  開催中のイベントはありません
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyDescription}
                >
                  {nextRoom
                    ? `次の予定: ${nextRoom.name} (${formatRoomPeriod(nextRoom)})`
                    : '参加済み room から支出履歴や今後の予定を確認できます。'}
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/rooms')}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    参加済みroomを見る
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
  );
}

function RoomRow({ room }: { room: UserRoomRecord }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/rooms/${room.id}/expenses/new` as never)}
      style={({ pressed }) => [
        styles.roomRow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roomRowMain}>
        <ThemedText type="smallBold">{room.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRoomPeriod(room)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        入力
      </ThemedText>
    </Pressable>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isRoomActive(room: UserRoomRecord, todayIso: string) {
  if (!room.start_date || !room.end_date) {
    return false;
  }

  return room.start_date <= todayIso && room.end_date >= todayIso;
}

function formatRoomPeriod(room: UserRoomRecord) {
  if (!room.start_date && !room.end_date) {
    return '期間未設定';
  }

  return `${room.start_date ?? '-'} - ${room.end_date ?? '-'}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
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
  featureCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  featureTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  featureTitle: {
    lineHeight: 32,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderRadius: Radius.control,
    padding: Spacing.two,
  },
  metaItem: {
    minWidth: 120,
    flex: 1,
    gap: Spacing.one,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
  },
  section: {
    gap: Spacing.two,
  },
  roomList: {
    gap: Spacing.two,
  },
  roomRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  roomRowMain: {
    flex: 1,
    gap: Spacing.one,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Radius.panel,
    borderWidth: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emptyTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
