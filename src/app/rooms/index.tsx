import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, IconButton, SurfaceCard } from '@/components/ios-ui';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RoomsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [rooms, setRooms] = useState<UserRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    fetchCurrentUserRooms()
      .then((data) => active && setRooms(data))
      .catch((caught) => {
        if (!active) return;
        const message =
          caught instanceof Error
            ? caught.message
            : 'イベント一覧を取得できませんでした。';
        if (message.includes('ログインが必要')) router.replace('/login');
        else setError(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [router]);

  const visibleRooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ja');
    return normalized
      ? rooms.filter((room) =>
          room.name.toLocaleLowerCase('ja').includes(normalized),
        )
      : rooms;
  }, [query, rooms]);
  const roomGroups = useMemo(
    () => groupRoomsByPeriod(visibleRooms),
    [visibleRooms],
  );

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: '#f2dfd5' }]}>
            <ThemedText type="smallBold">ME</ThemedText>
          </View>
          <View style={styles.topActions}>
            <IconButton
              accessibilityLabel="イベントを検索"
              onPress={() => setSearchOpen((value) => !value)}
              symbol={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
            />
            {rooms.some((room) => room.member_role === 'admin') ? (
              <IconButton
                accessibilityLabel="イベントを作成"
                filled
                onPress={() => router.push('/rooms/new')}
                symbol={{ ios: 'plus', android: 'add', web: 'add' }}
              />
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <ThemedText type="title" style={styles.title}>
              イベント
            </ThemedText>

            {searchOpen ? (
              <View
                style={[
                  styles.search,
                  { backgroundColor: theme.overBackground },
                ]}
              >
                <SymbolView
                  name={{
                    ios: 'magnifyingglass',
                    android: 'search',
                    web: 'search',
                  }}
                  size={18}
                  tintColor={theme.textSecondary}
                  fallback={
                    <Text style={{ color: theme.textSecondary }}>⌕</Text>
                  }
                />
                <TextInput
                  autoFocus
                  onChangeText={setQuery}
                  placeholder="イベント名で検索"
                  placeholderTextColor={theme.textDisabled}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={query}
                />
              </View>
            ) : null}

            {loading ? (
              <MessageCard
                title="読み込み中"
                message="参加中のイベントを確認しています。"
              />
            ) : null}
            {error ? (
              <MessageCard title="表示できませんでした" message={error} />
            ) : null}

            {!loading && !error && visibleRooms.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <ThemedText type="default" style={styles.emptyTitle}>
                  {query
                    ? '一致するイベントがありません'
                    : '参加中のイベントがありません'}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyText}
                >
                  {query
                    ? '別のキーワードを試してください。'
                    : '運営者からの招待をご確認ください。'}
                </ThemedText>
              </SurfaceCard>
            ) : null}

            {!loading && !error && visibleRooms.length > 0 ? (
              <View style={styles.roomSections}>
                {roomGroups.active.length > 0 ? (
                  <RoomSection title="開催中" count={roomGroups.active.length}>
                    <View style={styles.activeRoomList}>
                      {roomGroups.active.map((room) => (
                        <ActiveRoomCard key={room.id} room={room} />
                      ))}
                    </View>
                  </RoomSection>
                ) : !query ? (
                  <View
                    style={[
                      styles.noActiveRoom,
                      {
                        backgroundColor: theme.overBackground,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: 'calendar.badge.clock',
                        android: 'event_busy',
                        web: 'event_busy',
                      }}
                      size={20}
                      tintColor={theme.textSecondary}
                      fallback={
                        <Text style={{ color: theme.textSecondary }}>□</Text>
                      }
                    />
                    <View style={styles.noActiveText}>
                      <ThemedText type="smallBold">
                        現在開催中のイベントはありません
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        開催予定と過去のイベントは下から確認できます
                      </ThemedText>
                    </View>
                  </View>
                ) : null}

                <CompactRoomSection
                  rooms={roomGroups.upcoming}
                  title="開催予定"
                  tone="upcoming"
                />
                <CompactRoomSection
                  rooms={roomGroups.past}
                  title="過去のイベント"
                  tone="past"
                />
                <CompactRoomSection
                  rooms={roomGroups.undated}
                  title="日程未設定"
                  tone="undated"
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function RoomSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.activeDot} />
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {count}件
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function ActiveRoomCard({ room }: { room: UserRoomRecord }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityHint="イベント詳細を開きます"
      accessibilityLabel={`開催中のイベント、${room.name}`}
      accessibilityRole="button"
      onPress={() => router.push(`/rooms/${room.id}` as never)}
    >
      <SurfaceCard
        style={[styles.activeRoomCard, { borderColor: theme.primary }]}
      >
        <View style={styles.activeCardBadges}>
          <Badge label="開催中" tone="success" />
          <Badge
            label={room.member_role === 'admin' ? '運営者' : '参加者'}
            tone={room.member_role === 'admin' ? 'primary' : 'neutral'}
          />
        </View>

        <View style={styles.activeRoomHeading}>
          <ThemedText numberOfLines={2} style={styles.activeRoomName}>
            {room.name}
          </ThemedText>
          <View style={styles.dateRow}>
            <SymbolView
              name={{
                ios: 'calendar',
                android: 'calendar_today',
                web: 'calendar_today',
              }}
              size={15}
              tintColor={theme.textSecondary}
              fallback={<Text style={{ color: theme.textSecondary }}>□</Text>}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {formatPeriod(room)}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.activeStats,
            { backgroundColor: theme.overBackground },
          ]}
        >
          <View style={styles.totalStat}>
            <ThemedText type="small" themeColor="textSecondary">
              合計支出
            </ThemedText>
            <ThemedText style={styles.totalAmount}>
              {formatCurrency(room.expense_total_amount)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.activeStatDivider,
              { backgroundColor: theme.border },
            ]}
          />
          <Stat label="支出" value={`${room.expense_count}件`} />
          <Stat
            danger={room.pending_expense_count > 0}
            label="未確認"
            value={`${room.pending_expense_count}件`}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.openRoomRow}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            イベントを開く
          </ThemedText>
          <SymbolView
            name={{
              ios: 'chevron.right',
              android: 'chevron_right',
              web: 'chevron_right',
            }}
            size={15}
            tintColor={theme.primary}
            fallback={<Text style={{ color: theme.primary }}>›</Text>}
          />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

function CompactRoomSection({
  rooms,
  title,
  tone,
}: {
  rooms: UserRoomRecord[];
  title: string;
  tone: 'past' | 'undated' | 'upcoming';
}) {
  const theme = useTheme();

  if (rooms.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {rooms.length}件
        </ThemedText>
      </View>
      <View
        style={[
          styles.compactList,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        {rooms.map((room, index) => (
          <View key={room.id}>
            {index > 0 ? (
              <View
                style={[
                  styles.compactSeparator,
                  { backgroundColor: theme.border },
                ]}
              />
            ) : null}
            <CompactRoomRow room={room} tone={tone} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CompactRoomRow({
  room,
  tone,
}: {
  room: UserRoomRecord;
  tone: 'past' | 'undated' | 'upcoming';
}) {
  const router = useRouter();
  const theme = useTheme();
  const isUpcoming = tone === 'upcoming';

  return (
    <Pressable
      accessibilityHint="イベント詳細を開きます"
      accessibilityLabel={`${room.name}、${formatPeriod(room)}`}
      accessibilityRole="button"
      onPress={() => router.push(`/rooms/${room.id}` as never)}
      style={styles.compactRoomRow}
    >
      <View
        style={[
          styles.compactIcon,
          {
            backgroundColor: isUpcoming
              ? theme.primarySoft
              : theme.overBackground,
          },
        ]}
      >
        <SymbolView
          name={{
            ios: isUpcoming ? 'calendar.badge.clock' : 'calendar',
            android: isUpcoming ? 'event_upcoming' : 'calendar_today',
            web: isUpcoming ? 'event_upcoming' : 'calendar_today',
          }}
          size={19}
          tintColor={isUpcoming ? theme.primary : theme.textSecondary}
          fallback={
            <Text
              style={{
                color: isUpcoming ? theme.primary : theme.textSecondary,
              }}
            >
              □
            </Text>
          }
        />
      </View>

      <View style={styles.compactRoomText}>
        <ThemedText numberOfLines={1} style={styles.compactRoomName}>
          {room.name}
        </ThemedText>
        <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
          {formatPeriod(room)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {room.member_role === 'admin' ? '運営者' : '参加者'}・支出
          {room.expense_count}件
        </ThemedText>
      </View>

      <View style={styles.compactRoomAction}>
        {room.pending_expense_count > 0 ? (
          <View
            style={[styles.pendingDot, { backgroundColor: theme.danger }]}
          />
        ) : null}
        <SymbolView
          name={{
            ios: 'chevron.right',
            android: 'chevron_right',
            web: 'chevron_right',
          }}
          size={15}
          tintColor={theme.textDisabled}
          fallback={<Text style={{ color: theme.textDisabled }}>›</Text>}
        />
      </View>
    </Pressable>
  );
}

function groupRoomsByPeriod(rooms: UserRoomRecord[]) {
  const today = getLocalIsoDate();
  const groups: Record<RoomPeriodState, UserRoomRecord[]> = {
    active: [],
    past: [],
    undated: [],
    upcoming: [],
  };

  for (const room of rooms) {
    groups[getRoomPeriodState(room, today)].push(room);
  }

  groups.active.sort((first, second) =>
    compareNullableDates(first.end_date, second.end_date),
  );
  groups.upcoming.sort((first, second) =>
    compareNullableDates(first.start_date, second.start_date),
  );
  groups.past.sort((first, second) =>
    compareNullableDates(second.end_date, first.end_date),
  );
  groups.undated.sort((first, second) =>
    first.name.localeCompare(second.name, 'ja'),
  );

  return groups;
}

type RoomPeriodState = 'active' | 'past' | 'undated' | 'upcoming';

function getRoomPeriodState(
  room: UserRoomRecord,
  today: string,
): RoomPeriodState {
  if (!room.start_date && !room.end_date) {
    return 'undated';
  }

  if (room.start_date && room.start_date > today) {
    return 'upcoming';
  }

  if (room.end_date && room.end_date < today) {
    return 'past';
  }

  return 'active';
}

function getLocalIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function compareNullableDates(first: string | null, second: string | null) {
  if (first && second) {
    return first.localeCompare(second);
  }

  if (first) {
    return -1;
  }

  if (second) {
    return 1;
  }

  return 0;
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function Stat({
  danger,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.statLabel}
      >
        {label}
      </ThemedText>
      <ThemedText type="default" style={danger ? styles.dangerText : undefined}>
        {value}
        {danger ? ' ●' : ''}
      </ThemedText>
    </View>
  );
}

function MessageCard({ message, title }: { message: string; title: string }) {
  return (
    <SurfaceCard style={styles.messageCard}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </SurfaceCard>
  );
}

function formatPeriod(room: UserRoomRecord) {
  const start = room.start_date?.replaceAll('-', '.') ?? '未定';
  const end = room.end_date?.replaceAll('-', '.') ?? '未定';
  return `${start} - ${end}`;
}

const styles = StyleSheet.create({
  activeCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#20a550',
  },
  activeRoomCard: {
    gap: Spacing.three,
    borderWidth: 1.5,
    padding: 20,
  },
  activeRoomHeading: {
    gap: Spacing.two,
  },
  activeRoomList: {
    gap: Spacing.three,
  },
  activeRoomName: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  activeStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 42,
  },
  activeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  compactIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  compactList: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
  },
  compactRoomAction: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compactRoomName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  compactRoomRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compactRoomText: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  compactSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 18 },
  dangerText: { color: '#d9272e' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyText: { textAlign: 'center' },
  emptyTitle: { fontWeight: '700' },
  messageCard: { gap: 4 },
  noActiveRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  noActiveText: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  openRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomSections: {
    gap: 28,
  },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 48, fontFamily: Fonts.sans, fontSize: 16 },
  statLabel: { fontSize: 12, lineHeight: 16 },
  title: { marginTop: 6, marginBottom: 4, fontSize: 30, lineHeight: 38 },
  topActions: { flexDirection: 'row', gap: 10 },
  topBar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  totalStat: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
});
