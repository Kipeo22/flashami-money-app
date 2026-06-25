import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { TaskSheetModal } from '@/components/task-sheet-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomExpenses,
  summarizeExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
  type ExpenseType,
} from '@/lib/expenses';
import {
  ensureCurrentUserRoomMembership,
  fetchRoomById,
  fetchRoomMembers,
  type RoomMemberRecord,
  type RoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type ExpenseTypeFilter = 'all' | ExpenseType;
type ExpenseStatusFilter = 'all' | ExpenseStatus;

const expenseTypeFilters: { label: string; value: ExpenseTypeFilter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '共通経費', value: 'common' },
  { label: '個人間立替', value: 'personal' },
];

const statusFilters: { label: string; value: ExpenseStatusFilter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '未確認', value: 'pending' },
  { label: '承認済み', value: 'approved' },
  { label: '差し戻し', value: 'rejected' },
  { label: '精算済み', value: 'settled' },
];

export default function RoomExpenseListScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const router = useRouter();
  const theme = useTheme();
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [currentMembership, setCurrentMembership] =
    useState<RoomMemberRecord | null>(null);
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [expenseTypeFilter, setExpenseTypeFilter] =
    useState<ExpenseTypeFilter>('all');
  const [isTaskSheetVisible, setIsTaskSheetVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRoomExpenses() {
      if (!resolvedRoomId) {
        setError('roomId が指定されていません。');
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setError('支出一覧を表示できませんでした。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [membershipData, roomData, expenseData, memberData] =
          await Promise.all([
            ensureCurrentUserRoomMembership(resolvedRoomId),
            fetchRoomById(resolvedRoomId),
            fetchRoomExpenses(resolvedRoomId),
            fetchRoomMembers(resolvedRoomId),
          ]);

        if (!active) {
          return;
        }

        setCurrentMembership(membershipData);
        setRoom(roomData);
        setExpenses(expenseData);
        setMembers(memberData);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : '支出一覧の取得に失敗しました。';

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

    loadRoomExpenses();

    return () => {
      active = false;
    };
  }, [resolvedRoomId, router]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesExpenseType =
          expenseTypeFilter === 'all' ||
          expense.expense_type === expenseTypeFilter;
        const matchesStatus =
          statusFilter === 'all' || expense.status === statusFilter;

        return matchesExpenseType && matchesStatus;
      }),
    [expenseTypeFilter, expenses, statusFilter],
  );
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);
  const pendingExpenses = useMemo(
    () => expenses.filter((expense) => expense.status === 'pending'),
    [expenses],
  );
  const myExpenses = useMemo(
    () =>
      currentMembership
        ? expenses.filter(
            (expense) =>
              (currentMembership.user_id
                ? expense.payer_id === currentMembership.user_id
                : false) || expense.payer_email === currentMembership.email,
          )
        : [],
    [currentMembership, expenses],
  );
  const myExpenseTotal = useMemo(
    () => myExpenses.reduce((total, expense) => total + expense.amount, 0),
    [myExpenses],
  );
  const settlementRows = useMemo(
    () => calculateSettlementRows(expenses, members),
    [expenses, members],
  );
  const isAdmin = currentMembership?.role === 'admin';

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView style={styles.container}>
            <Pressable
              onPress={() => router.replace('/rooms')}
              style={({ pressed }) => [
                styles.backLink,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: 'chevron.left',
                  android: 'chevron_left',
                  web: 'chevron_left',
                }}
                size={16}
                tintColor={theme.primary}
                fallback={<Text style={{ color: theme.primary }}>‹</Text>}
              />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                イベント一覧
              </ThemedText>
            </Pressable>

            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">
                {room?.name ?? '支出一覧'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {room?.description || 'イベント内の支出を一覧で確認します。'}
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  イベント内の支出を取得しています。
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

            {!isLoading && !error ? (
              <>
                <View style={styles.summaryGrid}>
                  <SummaryTile label="支出合計" value={summary.total} />
                  <SummaryTile label="あなたの支出" value={myExpenseTotal} />
                  <SummaryTile label="共通経費" value={summary.common} />
                  <SummaryTile label="個人間立替" value={summary.personal} />
                </View>

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">あなたの支出</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {myExpenses.length}件
                    </ThemedText>
                  </View>

                  {myExpenses.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      このイベントで登録した支出はありません。
                    </ThemedText>
                  ) : (
                    <View style={styles.personalExpenseList}>
                      {myExpenses.slice(0, 3).map((expense) => (
                        <View
                          key={expense.id}
                          style={[
                            styles.personalExpenseRow,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.expenseTitleGroup}>
                            <ThemedText type="smallBold">
                              {expense.description}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {expense.paid_at}・
                              {formatExpenseStatus(expense.status)}
                            </ThemedText>
                          </View>
                          <ThemedText type="smallBold">
                            {formatCurrency(expense.amount)}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </ThemedView>

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">精算</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      承認済み
                    </ThemedText>
                  </View>

                  {settlementRows.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      精算対象の共通経費はありません。
                    </ThemedText>
                  ) : (
                    <View style={styles.settlementList}>
                      {settlementRows.map((row) => (
                        <View
                          key={`${row.from}-${row.to}-${row.amount}`}
                          style={[
                            styles.settlementRow,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.settlementNames}>
                            <ThemedText type="smallBold">{row.from}</ThemedText>
                            <SymbolView
                              name={{
                                ios: 'arrow.right',
                                android: 'arrow_forward',
                                web: 'arrow_forward',
                              }}
                              size={16}
                              tintColor={theme.textSecondary}
                              fallback={
                                <Text style={{ color: theme.textSecondary }}>
                                  →
                                </Text>
                              }
                            />
                            <ThemedText type="smallBold">{row.to}</ThemedText>
                          </View>
                          <ThemedText
                            type="smallBold"
                            style={{ color: theme.primary }}
                          >
                            {formatCurrency(row.amount)}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </ThemedView>

                {isAdmin ? (
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.card, { borderColor: theme.border }]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText type="smallBold">
                        このイベントのやること
                      </ThemedText>
                      <Badge label="管理権限あり" tone="primary" />
                    </View>

                    <View style={styles.taskActions}>
                      <Pressable
                        onPress={() => setIsTaskSheetVisible(true)}
                        style={({ pressed }) => [
                          styles.taskButton,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.taskButtonText}>
                          <ThemedText type="smallBold">承認待ち</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {pendingExpenses.length}件
                          </ThemedText>
                        </View>
                        <SymbolView
                          name={{
                            ios: 'checklist',
                            android: 'assignment_turned_in',
                            web: 'assignment_turned_in',
                          }}
                          size={20}
                          tintColor={theme.primary}
                          fallback={
                            <Text style={{ color: theme.primary }}>確認</Text>
                          }
                        />
                      </Pressable>

                      {resolvedRoomId ? (
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/rooms/${resolvedRoomId}/members` as never,
                            )
                          }
                          style={({ pressed }) => [
                            styles.taskButton,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.taskButtonText}>
                            <ThemedText type="smallBold">メンバー</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {members.length}名
                            </ThemedText>
                          </View>
                          <SymbolView
                            name={{
                              ios: 'person.3.fill',
                              android: 'groups',
                              web: 'groups',
                            }}
                            size={20}
                            tintColor={theme.primary}
                            fallback={
                              <Text style={{ color: theme.primary }}>人</Text>
                            }
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </ThemedView>
                ) : null}

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">メンバー</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {members.length}名
                    </ThemedText>
                  </View>

                  {members.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      メンバーはまだ登録されていません。
                    </ThemedText>
                  ) : (
                    <View style={styles.memberList}>
                      {members.map((member) => (
                        <View
                          key={member.id}
                          style={[
                            styles.memberRow,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.memberMain}>
                            <ThemedText
                              type="smallBold"
                              style={styles.memberName}
                            >
                              {member.display_name || member.email}
                            </ThemedText>
                            <ThemedText
                              type="small"
                              themeColor="textSecondary"
                              style={styles.memberEmail}
                            >
                              {member.email}
                            </ThemedText>
                          </View>
                          <View style={styles.badgeRowCompact}>
                            <Badge
                              label={formatMemberRole(member.role)}
                              tone={
                                member.role === 'admin' ? 'primary' : 'neutral'
                              }
                            />
                            <Badge
                              label={formatMemberStatus(member.status)}
                              tone={
                                member.status === 'joined'
                                  ? 'primary'
                                  : 'neutral'
                              }
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ThemedView>

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">絞り込み</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {filteredExpenses.length} / {expenses.length}件
                    </ThemedText>
                  </View>

                  <FilterGroup label="支出タイプ">
                    {expenseTypeFilters.map((filter) => (
                      <FilterButton
                        key={filter.value}
                        isSelected={expenseTypeFilter === filter.value}
                        label={filter.label}
                        onPress={() => setExpenseTypeFilter(filter.value)}
                      />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="ステータス">
                    {statusFilters.map((filter) => (
                      <FilterButton
                        key={filter.value}
                        isSelected={statusFilter === filter.value}
                        label={filter.label}
                        onPress={() => setStatusFilter(filter.value)}
                      />
                    ))}
                  </FilterGroup>
                </ThemedView>

                {filteredExpenses.length === 0 ? (
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.emptyCard, { borderColor: theme.border }]}
                  >
                    <ThemedText type="default" style={styles.emptyTitle}>
                      表示できる支出がありません
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.emptyDescription}
                    >
                      条件を変更するか、新しく支出を登録してください。
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.expenseList}>
                    {filteredExpenses.map((expense) => (
                      <Pressable
                        key={expense.id}
                        onPress={() =>
                          router.push(
                            `/rooms/${expense.room_id}/expenses/${expense.id}` as any,
                          )
                        }
                        style={({ pressed }) => [
                          styles.expenseCard,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: theme.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.expenseHeader}>
                          <View style={styles.expenseTitleGroup}>
                            <ThemedText
                              type="smallBold"
                              style={styles.expenseTitle}
                            >
                              {expense.description}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {expense.paid_at}・{expense.category}
                            </ThemedText>
                          </View>
                          <ThemedText type="default" style={styles.amountText}>
                            {formatCurrency(expense.amount)}
                          </ThemedText>
                        </View>

                        <View style={styles.badgeRow}>
                          <Badge
                            label={formatExpenseType(expense.expense_type)}
                            tone={
                              expense.expense_type === 'common'
                                ? 'primary'
                                : 'neutral'
                            }
                          />
                          <Badge
                            label={formatExpenseStatus(expense.status)}
                            tone={getStatusBadgeTone(expense.status)}
                          />
                          {expense.receipt_image_url ? (
                            <Badge label="レシートあり" tone="primary" />
                          ) : (
                            <Badge label="レシートなし" tone="neutral" />
                          )}
                        </View>

                        <View style={styles.metaRow}>
                          <Meta
                            label="支払者"
                            value={
                              expense.payer_display_name ||
                              expense.payer_email ||
                              '未設定'
                            }
                          />
                          <Meta label="対象者" value={formatTargets(expense)} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
        {resolvedRoomId ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.actionFooter, { borderTopColor: theme.border }]}
          >
            <View style={styles.actionFooterInner}>
              <Pressable
                onPress={() =>
                  router.push(`/rooms/${resolvedRoomId}/expenses/new` as never)
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  size={18}
                  tintColor="#ffffff"
                  fallback={<Text style={styles.primaryIconFallback}>+</Text>}
                />
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  支出を登録
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : null}
      </SafeAreaView>
      <BottomNav />
      {resolvedRoomId ? (
        <TaskSheetModal
          activeRoomIds={[resolvedRoomId]}
          onClose={() => setIsTaskSheetVisible(false)}
          visible={isTaskSheetVisible}
        />
      ) : null}
    </ThemedView>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.summaryTile, { borderColor: theme.border }]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.summaryValue}>
        {formatCurrency(value)}
      </ThemedText>
    </ThemedView>
  );
}

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.filterGroup}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.filterRow}>{children}</View>
    </View>
  );
}

function FilterButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        {
          backgroundColor: isSelected ? theme.primarySoft : 'transparent',
          borderColor: isSelected ? theme.primary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: isSelected ? theme.primary : theme.textSecondary }}
      >
        {label}
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

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'neutral' | 'primary';
}) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'primary'
      ? theme.primarySoft
      : tone === 'danger'
        ? theme.backgroundSelected
        : theme.backgroundSelected;
  const color =
    tone === 'primary'
      ? theme.primary
      : tone === 'danger'
        ? theme.danger
        : theme.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <ThemedText type="smallBold" style={[styles.badgeText, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}

function formatExpenseType(expenseType: ExpenseType) {
  return expenseType === 'common' ? '共通経費' : '個人間立替';
}

function formatExpenseStatus(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    approved: '承認済み',
    pending: '未確認',
    rejected: '差し戻し',
    settled: '精算済み',
  };

  return labels[status] ?? status;
}

function getStatusBadgeTone(status: ExpenseStatus) {
  if (status === 'approved') {
    return 'primary';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'neutral';
}

function formatMemberRole(role: RoomMemberRecord['role']) {
  return role === 'admin' ? '管理権限' : 'メンバー';
}

function formatMemberStatus(status: RoomMemberRecord['status']) {
  return status === 'joined' ? '参加中' : '招待中';
}

function formatTargets(expense: ExpenseListItem) {
  if (expense.expense_type === 'common') {
    return '全体';
  }

  if (expense.target_labels.length === 0) {
    return '未設定';
  }

  if (expense.target_labels.length <= 2) {
    return expense.target_labels.join('、');
  }

  return `${expense.target_labels.slice(0, 2).join('、')}ほか${
    expense.target_labels.length - 2
  }名`;
}

type SettlementRow = {
  amount: number;
  from: string;
  to: string;
};

function calculateSettlementRows(
  expenses: ExpenseListItem[],
  members: RoomMemberRecord[],
): SettlementRow[] {
  const joinedMembers = members.filter((member) => member.status === 'joined');

  if (joinedMembers.length === 0) {
    return [];
  }

  const balanceByName = new Map<string, number>();
  for (const member of joinedMembers) {
    balanceByName.set(getMemberLabel(member), 0);
  }

  for (const expense of expenses) {
    if (
      expense.expense_type !== 'common' ||
      (expense.status !== 'approved' && expense.status !== 'settled')
    ) {
      continue;
    }

    const payerLabel =
      expense.payer_display_name || expense.payer_email || '支払者未設定';
    const share = Math.round(expense.amount / joinedMembers.length);

    balanceByName.set(
      payerLabel,
      (balanceByName.get(payerLabel) ?? 0) + expense.amount,
    );

    for (const member of joinedMembers) {
      const memberLabel = getMemberLabel(member);
      balanceByName.set(
        memberLabel,
        (balanceByName.get(memberLabel) ?? 0) - share,
      );
    }
  }

  const debtors = Array.from(balanceByName.entries())
    .filter(([, balance]) => balance < 0)
    .map(([name, balance]) => ({ name, amount: Math.abs(balance) }))
    .sort((first, second) => second.amount - first.amount);
  const creditors = Array.from(balanceByName.entries())
    .filter(([, balance]) => balance > 0)
    .map(([name, balance]) => ({ name, amount: balance }))
    .sort((first, second) => second.amount - first.amount);
  const rows: SettlementRow[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtors[debtorIndex] && creditors[creditorIndex]) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      rows.push({
        amount,
        from: debtor.name,
        to: creditor.name,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0) {
      debtorIndex += 1;
    }

    if (creditor.amount <= 0) {
      creditorIndex += 1;
    }
  }

  return rows;
}

function getMemberLabel(member: RoomMemberRecord) {
  return member.display_name || member.email;
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
  backLink: {
    minHeight: 32,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  header: {
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  primaryIconFallback: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 18,
  },
  actionFooter: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  actionFooterInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  taskActions: {
    gap: Spacing.two,
  },
  taskButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  taskButtonText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryTile: {
    minWidth: 160,
    flex: 1,
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  filterGroup: {
    gap: Spacing.one,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  expenseList: {
    gap: Spacing.two,
  },
  personalExpenseList: {
    gap: Spacing.two,
  },
  personalExpenseRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  expenseCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  expenseTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  expenseTitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  amountText: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badgeRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaItem: {
    minWidth: 160,
    flex: 1,
    gap: Spacing.one,
  },
  settlementList: {
    gap: Spacing.two,
  },
  settlementNames: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  settlementRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  memberList: {
    gap: Spacing.two,
  },
  memberRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  memberMain: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  memberName: {
    flexShrink: 1,
  },
  memberEmail: {
    flexShrink: 1,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: Radius.panel,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
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
  },
});
