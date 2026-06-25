import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
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
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.screenTitle}>
                参加済みroom
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                参加しているイベントや旅行の支出を確認できます。
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <InfoCard title="読み込み中">
                ログイン中ユーザーに紐づくroomを取得しています。
              </InfoCard>
            ) : null}

            {error ? (
              <InfoCard title="取得に失敗しました">{error}</InfoCard>
            ) : null}

            {!isLoading && !error && rooms.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.emptyCard,
                  { borderColor: theme.border },
                  Shadows.card,
                ]}
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
              </ThemedView>
            ) : null}

            {!isLoading && rooms.length > 0 ? (
              <>
                <View style={styles.listHeader}>
                  <ThemedText type="smallBold">Room一覧</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rooms.length}件
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => router.push('/rooms/new')}
                  style={({ pressed }) => [
                    styles.smallCreateButton,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">＋ 作成</ThemedText>
                </Pressable>

                <View style={styles.roomList}>
                  {rooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </View>
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function RoomCard({ room }: { room: UserRoomRecord }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/rooms/${room.id}` as never)}
      style={({ pressed }) => [
        styles.roomCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roomCardHeader}>
        <View style={styles.roomIdentity}>
          <View
            style={[styles.roomIcon, { backgroundColor: theme.primarySoft }]}
          >
            <SymbolView
              name={{
                ios: 'person.3.fill',
                android: 'groups',
                web: 'groups',
              }}
              size={20}
              tintColor={theme.primary}
              fallback={
                <Text
                  style={[styles.roomIconFallback, { color: theme.primary }]}
                >
                  R
                </Text>
              }
            />
          </View>
          <View style={styles.roomTitleGroup}>
            <ThemedText type="smallBold" style={styles.roomTitle}>
              {room.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Room詳細と支出一覧を開く
            </ThemedText>
          </View>
        </View>
        <SymbolView
          name={{
            ios: 'chevron.right',
            android: 'chevron_right',
            web: 'chevron_right',
          }}
          size={18}
          tintColor={theme.textDisabled}
          fallback={<Text style={{ color: theme.textDisabled }}>›</Text>}
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {room.description || '説明はまだ登録されていません。'}
      </ThemedText>

      <View style={[styles.metaRow, { backgroundColor: theme.overBackground }]}>
        <Meta label="期間" value={formatRoomPeriod(room)} />
        <Meta label="支出" value={`${room.expense_count}件`} />
        <Meta label="状態" value={formatMemberStatus(room)} />
      </View>

      <View style={styles.openHint}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          Roomを開く
        </ThemedText>
      </View>
    </Pressable>
  );
}

function InfoCard({ children, title }: { children: string; title: string }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }, Shadows.card]}
    >
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {children}
      </ThemedText>
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
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  screenTitle: {
    lineHeight: 40,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  roomList: {
    gap: Spacing.three,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  roomCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  roomIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  roomIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  roomIconFallback: {
    fontSize: 14,
    fontWeight: '700',
  },
  roomTitleGroup: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  roomTitle: {
    fontSize: 18,
    lineHeight: 22,
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
  openHint: {
    alignItems: 'flex-end',
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
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  smallCreateButton: {
    minHeight: 32,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
