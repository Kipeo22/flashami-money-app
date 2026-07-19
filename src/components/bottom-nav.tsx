import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIcon } from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExpenseType } from '@/lib/expenses';
import {
  fetchCurrentUserRooms,
  getLocalIsoDate,
  isExpenseRegistrationOpen,
  isRoomActiveOnDate,
  type UserRoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const navItems: {
  href: '/account' | '/expenses' | '/notifications' | '/rooms';
  isActive: (pathname: string) => boolean;
  label: string;
  symbol: SymbolName;
}[] = [
  {
    href: '/rooms',
    isActive: (pathname) => pathname.startsWith('/rooms'),
    label: 'イベント',
    symbol: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  },
  {
    href: '/expenses',
    isActive: (pathname) => pathname === '/expenses',
    label: '履歴',
    symbol: {
      ios: 'clock.fill',
      android: 'history',
      web: 'history',
    },
  },
  {
    href: '/notifications',
    isActive: (pathname) => pathname === '/notifications',
    label: '通知',
    symbol: {
      ios: 'bell.fill',
      android: 'notifications',
      web: 'notifications',
    },
  },
  {
    href: '/account',
    isActive: (pathname) => pathname === '/account',
    label: '設定',
    symbol: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  },
];

export function BottomNav({ roomId }: { roomId?: string | null } = {}) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [roomChoices, setRoomChoices] = useState<UserRoomRecord[]>([]);
  const [selectedExpenseType, setSelectedExpenseType] =
    useState<ExpenseType | null>(null);

  const closeSheet = () => {
    setIsTypeSheetOpen(false);
    setSelectedExpenseType(null);
    setRoomChoices([]);
    setFeedback(null);
  };

  const openExpenseForm = async (
    type: ExpenseType,
    selectedRoomId?: string,
  ) => {
    if (isOpening) return;
    setIsOpening(true);
    setFeedback(null);

    try {
      if (!isSupabaseConfigured) {
        router.push('/login');
        closeSheet();
        return;
      }

      const rooms = await fetchCurrentUserRooms();
      const today = getLocalIsoDate();
      const openRooms = rooms.filter((candidate) =>
        isExpenseRegistrationOpen(candidate, today),
      );
      let targetRoomId = selectedRoomId ?? roomId ?? null;

      if (targetRoomId) {
        const selectedRoom = openRooms.find(
          (candidate) => candidate.id === targetRoomId,
        );
        if (!selectedRoom) {
          setFeedback('このイベントは現在、支出登録期間外です。');
          return;
        }
      } else {
        const activeRooms = openRooms.filter((candidate) =>
          isRoomActiveOnDate(candidate, today),
        );
        if (activeRooms.length === 1) {
          targetRoomId = activeRooms[0].id;
        } else {
          const choices = activeRooms.length > 1 ? activeRooms : openRooms;
          if (choices.length > 0) {
            setSelectedExpenseType(type);
            setRoomChoices(choices);
            return;
          }
        }
      }

      if (!targetRoomId) {
        setFeedback('現在、支出を登録できるイベントがありません。');
        return;
      }

      closeSheet();
      router.push(`/rooms/${targetRoomId}/expenses/new?type=${type}` as never);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'イベントを取得できませんでした。',
      );
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <>
      <View
        style={[
          styles.shell,
          Shadows.tabBar,
          {
            backgroundColor: theme.backgroundElement,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.container}>
          <NavButton item={navItems[0]} pathname={pathname} />
          <NavButton item={navItems[1]} pathname={pathname} />
          <Pressable
            accessibilityLabel="支出を記録"
            accessibilityRole="button"
            onPress={() => setIsTypeSheetOpen(true)}
            style={styles.actionSlot}
          >
            <View
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.backgroundElement,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={28}
                tintColor="#ffffff"
                weight="semibold"
                fallback={<Text style={styles.actionFallback}>＋</Text>}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.actionLabel, { color: theme.primary }]}
            >
              支出記録
            </Text>
          </Pressable>
          <NavButton item={navItems[2]} pathname={pathname} />
          <NavButton item={navItems[3]} pathname={pathname} />
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeSheet}
        transparent
        visible={isTypeSheetOpen}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              {selectedExpenseType
                ? '登録先のイベントを選択'
                : 'どの種類の支出ですか？'}
            </ThemedText>

            <ScrollView
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.sheetBody}
            >
              {selectedExpenseType ? (
                <View style={styles.roomChoiceList}>
                  {roomChoices.map((choice) => (
                    <RoomChoiceCard
                      key={choice.id}
                      onPress={() =>
                        openExpenseForm(selectedExpenseType, choice.id)
                      }
                      room={choice}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.expenseTypeList}>
                  <ExpenseTypeCard
                    description={
                      '参加費やイベント会計から支払うもの\n（宿泊費、レンタカー代など）'
                    }
                    label="共通経費"
                    onPress={() => openExpenseForm('common')}
                    symbol={{
                      ios: 'person.2.fill',
                      android: 'groups',
                      web: 'groups',
                    }}
                  />
                  <ExpenseTypeCard
                    color="orange"
                    description={
                      '一部メンバー間であとから割り勘するもの\n（食事、タクシーなど）'
                    }
                    label="個人間立替"
                    onPress={() => openExpenseForm('personal')}
                    symbol={{
                      ios: 'person.badge.plus',
                      android: 'person_add',
                      web: 'person_add',
                    }}
                  />
                </View>
              )}
            </ScrollView>

            {feedback ? (
              <ThemedText
                type="small"
                themeColor="danger"
                style={styles.feedback}
              >
                {feedback}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={closeSheet}
              style={[styles.cancelButton, { borderColor: theme.border }]}
            >
              <ThemedText>キャンセル</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function NavButton({
  item,
  pathname,
}: {
  item: (typeof navItems)[number];
  pathname: string;
}) {
  const router = useRouter();
  const theme = useTheme();
  const active = item.isActive(pathname);
  const color = active ? theme.primary : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => router.replace(item.href)}
      style={styles.tabButton}
    >
      <SymbolView
        name={item.symbol}
        size={24}
        tintColor={color}
        type={active ? 'hierarchical' : 'monochrome'}
        fallback={<Text style={{ color }}>•</Text>}
      />
      <Text
        numberOfLines={1}
        style={[styles.label, { color, fontWeight: active ? '700' : '500' }]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function RoomChoiceCard({
  onPress,
  room,
}: {
  onPress: () => void;
  room: UserRoomRecord;
}) {
  const theme = useTheme();
  const period =
    room.start_date || room.end_date
      ? `${room.start_date ?? '開始日未定'} 〜 ${room.end_date ?? '終了日未定'}`
      : 'イベント日程未設定';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.roomChoice, { backgroundColor: theme.overBackground }]}
    >
      <View style={styles.roomChoiceText}>
        <ThemedText type="default" style={styles.typeTitle}>
          {room.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {period}
        </ThemedText>
      </View>
      <ThemedText style={{ color: theme.primary }}>›</ThemedText>
    </Pressable>
  );
}

function ExpenseTypeCard({
  color,
  description,
  label,
  onPress,
  symbol,
}: {
  color?: 'orange';
  description: string;
  label: string;
  onPress: () => void;
  symbol: SymbolName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.typeCard, { backgroundColor: theme.overBackground }]}
    >
      <RoundIcon color={color} symbol={symbol} />
      <View style={styles.typeText}>
        <ThemedText type="default" style={styles.typeTitle}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 20, 24, 0.52)',
  },
  cancelButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    marginTop: 8,
    paddingHorizontal: 32,
  },
  actionButton: {
    position: 'absolute',
    top: -25,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderRadius: 29,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  actionFallback: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 31,
  },
  actionLabel: {
    position: 'absolute',
    top: 37,
    width: 74,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionSlot: {
    position: 'relative',
    width: '20%',
    maxWidth: '20%',
    height: 54,
    flexBasis: '20%',
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    overflow: 'visible',
  },
  container: { height: 54, flexDirection: 'row', alignItems: 'stretch' },
  feedback: { textAlign: 'center' },
  expenseTypeList: { gap: 14 },
  handle: {
    width: 38,
    height: 5,
    alignSelf: 'center',
    borderRadius: 3,
    marginBottom: 24,
  },
  label: {
    width: '100%',
    marginTop: 1,
    paddingHorizontal: 2,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  roomChoice: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roomChoiceList: { gap: 10 },
  roomChoiceText: { flex: 1, gap: 2 },
  sheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '88%',
    alignSelf: 'center',
    gap: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetBody: { flexShrink: 1 },
  sheetBodyContent: { paddingVertical: 2 },
  sheetTitle: { marginBottom: 6, textAlign: 'center', fontSize: 22 },
  shell: {
    width: '100%',
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    width: '20%',
    maxWidth: '20%',
    flexBasis: '20%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 6,
  },
  typeCard: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: Radius.panel,
    padding: 18,
  },
  typeText: { flex: 1, gap: 3 },
  typeTitle: { fontWeight: '700' },
});
