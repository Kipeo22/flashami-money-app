import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RoomsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [rooms, setRooms] = useState<UserRoomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      if (!isSupabaseConfigured) {
        setError('room一覧を表示できませんでした。');
        setIsLoading(false);
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
            : 'room一覧の取得に失敗しました。';

        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }

        setError(message);
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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">参加済みroom</ThemedText>
              <ThemedText themeColor="textSecondary">
                参加しているイベントや旅行の支出を確認できます。
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.actions}>
              <Pressable
                onPress={() => router.push('/rooms/new')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: theme.primary,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="default" style={styles.primaryButtonText}>
                  新しくRoomを作成
                </ThemedText>
              </Pressable>
            </ThemedView>

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ログイン中ユーザーに紐づくroomを取得しています。
                </ThemedText>
              </ThemedView>
            ) : null}

            {error ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">取得に失敗しました</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            {!isLoading && !error && rooms.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.emptyCard, { borderColor: theme.border }]}
              >
                <ThemedText type="default" style={styles.emptyTitle}>
                  参加中のRoomがありません
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyDescription}
                >
                  新しくイベントや旅行のRoomを作成して、メンバーと支出を記録しましょう。
                </ThemedText>

                <Pressable
                  onPress={() => router.push('/rooms/new')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.primary,
                      marginTop: Spacing.four,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="default" style={styles.primaryButtonText}>
                    新しくRoomを作成する
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}

            {!isLoading && rooms.length > 0 ? (
              <View style={styles.roomList}>
                {rooms.map((room) => (
                  <ThemedView
                    key={room.id}
                    type="backgroundElement"
                    style={[styles.roomCard, { borderColor: theme.border }]}
                  >
                    <View style={styles.roomCardHeader}>
                      <ThemedText type="smallBold" style={styles.roomTitle}>
                        {room.name}
                      </ThemedText>
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: theme.primarySoft },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.primary }}
                        >
                          {room.expense_count}件
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {room.description || '説明はまだ登録されていません。'}
                    </ThemedText>
                    <View
                      style={[
                        styles.metaRow,
                        { backgroundColor: theme.overBackground },
                      ]}
                    >
                      <Meta label="期間" value={formatRoomPeriod(room)} />
                      <Meta label="ロール" value={room.member_role} />
                      <Meta label="状態" value={formatMemberStatus(room)} />
                    </View>
                    <View style={styles.roomActions}>
                      <Pressable
                        onPress={() => router.push(`/rooms/${room.id}` as any)}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          styles.roomActionButton,
                          {
                            backgroundColor: theme.primarySoft,
                            borderColor: theme.primary,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="default"
                          style={styles.primaryButtonText}
                        >
                          支出一覧を見る
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          router.push(`/rooms/${room.id}/expenses/new` as any)
                        }
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          styles.roomActionButton,
                          { borderColor: theme.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="default"
                          style={{ color: theme.primary, fontWeight: 'bold' }}
                        >
                          支出を登録する
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          router.push(`/rooms/${room.id}/members` as any)
                        }
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          styles.roomActionButton,
                          { borderColor: theme.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="default"
                          style={{ color: theme.primary, fontWeight: 'bold' }}
                        >
                          参加者を見る
                        </ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                ))}
              </View>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
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

function formatRoomPeriod(room: UserRoomRecord) {
  if (!room.start_date && !room.end_date) {
    return '-';
  }

  return `${room.start_date ?? '-'} - ${room.end_date ?? '-'}`;
}

function formatMemberStatus(room: UserRoomRecord) {
  return room.member_status === 'joined' ? '参加中' : '招待中';
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
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  roomList: {
    gap: Spacing.two,
  },
  roomCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  roomTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 27,
  },
  countBadge: {
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
  roomActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  roomActionButton: {
    flexGrow: 1,
  },
  actions: {
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#0077c7',
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
  pressed: {
    opacity: 0.72,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: Radius.panel,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  emptyTitle: {
    fontWeight: 'bold',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
