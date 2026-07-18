import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIcon } from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExpenseType } from '@/lib/expenses';
import { fetchCurrentUserRooms } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const navItems: {
  href: '/account' | '/admin' | '/rooms';
  isActive: (pathname: string) => boolean;
  label: string;
  symbol: SymbolName;
}[] = [
  {
    href: '/rooms',
    isActive: (pathname) => pathname.startsWith('/rooms'),
    label: 'Rooms',
    symbol: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  },
  {
    href: '/admin',
    isActive: (pathname) => pathname.startsWith('/admin'),
    label: 'Activity',
    symbol: {
      ios: 'clock.arrow.circlepath',
      android: 'history',
      web: 'history',
    },
  },
  {
    href: '/account',
    isActive: (pathname) => pathname === '/account',
    label: 'Settings',
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

  const openExpenseForm = async (type: ExpenseType) => {
    if (isOpening) return;
    setIsOpening(true);
    setFeedback(null);

    try {
      let targetRoomId = roomId ?? null;
      if (!targetRoomId) {
        if (!isSupabaseConfigured) {
          router.push('/login');
          setIsTypeSheetOpen(false);
          return;
        }
        const rooms = await fetchCurrentUserRooms();
        targetRoomId = rooms[0]?.id ?? null;
      }

      if (!targetRoomId) {
        setFeedback('支出を追加するroomを先に作成してください。');
        return;
      }

      setIsTypeSheetOpen(false);
      router.push(`/rooms/${targetRoomId}/expenses/new?type=${type}` as never);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'roomを取得できませんでした。',
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
          <Pressable
            accessibilityLabel="支出を追加"
            accessibilityRole="button"
            onPress={() => setIsTypeSheetOpen(true)}
            style={styles.tabButton}
          >
            <SymbolView
              name={{
                ios: 'plus.circle',
                android: 'add_circle_outline',
                web: 'add_circle_outline',
              }}
              size={25}
              tintColor={theme.textSecondary}
              fallback={<Text style={{ color: theme.textSecondary }}>＋</Text>}
            />
            <Text
              numberOfLines={1}
              style={[styles.label, { color: theme.textSecondary }]}
            >
              Add Expense
            </Text>
          </Pressable>
          <NavButton item={navItems[1]} pathname={pathname} />
          <NavButton item={navItems[2]} pathname={pathname} />
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsTypeSheetOpen(false)}
        transparent
        visible={isTypeSheetOpen}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsTypeSheetOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              どの種類の支出ですか？
            </ThemedText>

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
              onPress={() => setIsTypeSheetOpen(false)}
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
  container: { height: 49, flexDirection: 'row', alignItems: 'stretch' },
  feedback: { textAlign: 'center' },
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
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    includeFontPadding: false,
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetTitle: { marginBottom: 6, textAlign: 'center', fontSize: 22 },
  shell: {
    width: '100%',
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    width: '25%',
    maxWidth: '25%',
    flexBasis: '25%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 4,
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
