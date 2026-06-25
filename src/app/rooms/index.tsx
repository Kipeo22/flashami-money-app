import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.screenTitle}>
                イベント
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                参加したイベントの支出、精算、メンバーを確認できます。
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
                  参加中のイベントがありません
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyDescription}
                >
                  新しくイベントを作成して、メンバーと支出を記録しましょう。
                </ThemedText>
              </ThemedView>
            ) : null}

            {!isLoading && rooms.length > 0 ? (
              <>
                <View style={styles.listHeader}>
                  <ThemedText type="smallBold">イベント一覧</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rooms.length}件
                  </ThemedText>
                </View>
                <View style={styles.roomList}>
                  {rooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </View>
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
        <ThemedView
          type="backgroundElement"
          style={[styles.createFooter, { borderTopColor: theme.border }]}
        >
          <View style={styles.createFooterInner}>
            <Pressable
              onPress={() => router.push('/rooms/new')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.buttonContent}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  size={18}
                  tintColor="#ffffff"
                  fallback={<Text style={styles.buttonIconFallback}>+</Text>}
                />
                <ThemedText type="default" style={styles.primaryButtonText}>
                  新しくイベントを作成
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </ThemedView>
        <BottomNav />
      </SafeAreaView>
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
              支出と精算を開く
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

      {room.member_role === 'admin' ? (
        <View
          style={[styles.roleBadge, { backgroundColor: theme.primarySoft }]}
        >
          <SymbolView
            name={{
              ios: 'checkmark.shield.fill',
              android: 'verified_user',
              web: 'verified_user',
            }}
            size={16}
            tintColor={theme.primary}
            fallback={<Text style={{ color: theme.primary }}>✓</Text>}
          />
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            管理権限あり
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.metaRow, { backgroundColor: theme.overBackground }]}>
        <Meta label="期間" value={formatRoomPeriod(room)} />
        <Meta
          label="支出合計"
          value={formatCurrency(room.expense_total_amount)}
        />
        <Meta
          label="承認済み"
          value={formatCurrency(room.approved_expense_total_amount)}
        />
        <Meta label="参加状態" value={formatMemberStatus(room)} />
      </View>

      <View style={styles.openHint}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          イベントを開く
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

function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
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
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonIconFallback: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 18,
  },
  createFooter: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  createFooterInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  openHint: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
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
});
