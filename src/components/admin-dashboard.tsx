import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { summarizeExpenses, type ExpenseStatus } from '@/lib/expenses';
import type { AdminExpenseItem, AdminRoomDashboard } from '@/lib/admin';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export function AdminInfoCard({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
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

export function AdminBackLink({
  label = '管理トップ',
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
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
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function AdminSummaryActionTile({
  description,
  label,
  onPress,
  symbol,
  value,
}: {
  description: string;
  label: string;
  onPress: () => void;
  symbol: SymbolName;
  value: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.summaryTile,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.summaryTileHeader}>
        <View
          style={[styles.summaryIcon, { backgroundColor: theme.primarySoft }]}
        >
          <SymbolView
            name={symbol}
            size={20}
            tintColor={theme.primary}
            fallback={
              <Text style={[styles.iconFallback, { color: theme.primary }]}>
                {label.slice(0, 1)}
              </Text>
            }
          />
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
      <View style={styles.summaryTileBody}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="default" style={styles.summaryValue}>
          {value}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function AdminReviewItem({
  isUpdating,
  item,
  onApprove,
  onOpenDetail,
  onReject,
  onRejectionReasonChange,
  rejectionReason,
}: {
  isUpdating: boolean;
  item: AdminExpenseItem;
  onApprove: () => void;
  onOpenDetail: () => void;
  onReject: () => void;
  onRejectionReasonChange: (value: string) => void;
  rejectionReason: string;
}) {
  const theme = useTheme();
  const expense = item.expense;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.reviewItem, { borderColor: theme.border }, Shadows.card]}
    >
      <AdminExpenseHeader item={item} />

      <View style={styles.badgeRow}>
        <AdminBadge
          label={formatExpenseType(expense.expense_type)}
          tone={expense.expense_type === 'common' ? 'primary' : 'neutral'}
        />
        <AdminBadge label="未確認" tone="neutral" />
        {expense.receipt_image_url ? (
          <AdminBadge label="レシートあり" tone="primary" />
        ) : (
          <AdminBadge label="レシートなし" tone="danger" />
        )}
      </View>

      <View style={styles.metaRow}>
        <AdminMeta
          label="支払者"
          value={expense.payer_display_name || expense.payer_email || '未設定'}
        />
        <AdminMeta label="対象者" value={formatTargets(expense)} />
      </View>

      {!expense.receipt_image_url ? (
        <ThemedView type="overBackground" style={styles.noReceiptBox}>
          <ThemedText type="smallBold">レシートなし</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {expense.no_receipt_reason || '理由未入力'}
          </ThemedText>
          {expense.no_receipt_note ? (
            <ThemedText type="small" themeColor="textSecondary">
              {expense.no_receipt_note}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}

      <TextInput
        multiline
        editable={!isUpdating}
        onChangeText={onRejectionReasonChange}
        placeholder="差し戻す場合の理由を入力"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textArea,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={rejectionReason}
      />

      <View style={styles.actions}>
        <Pressable
          disabled={isUpdating}
          onPress={onApprove}
          style={({ pressed }) => [
            styles.primaryActionButton,
            {
              backgroundColor: isUpdating
                ? theme.backgroundSelected
                : theme.primary,
            },
            pressed && !isUpdating && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{
              color: isUpdating ? theme.textSecondary : '#ffffff',
            }}
          >
            承認
          </ThemedText>
        </Pressable>

        <Pressable
          disabled={isUpdating}
          onPress={onReject}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            {
              borderColor: isUpdating ? theme.border : theme.danger,
            },
            pressed && !isUpdating && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: isUpdating ? theme.textSecondary : theme.danger }}
          >
            差し戻し
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onOpenDetail}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            詳細
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export function AdminExpenseCard({ item }: { item: AdminExpenseItem }) {
  const router = useRouter();
  const theme = useTheme();
  const expense = item.expense;

  return (
    <Pressable
      onPress={() =>
        router.push(`/rooms/${item.room.id}/expenses/${expense.id}` as never)
      }
      style={({ pressed }) => [
        styles.reviewItem,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <AdminExpenseHeader item={item} />

      <View style={styles.badgeRow}>
        <AdminBadge
          label={formatExpenseType(expense.expense_type)}
          tone={expense.expense_type === 'common' ? 'primary' : 'neutral'}
        />
        <AdminBadge
          label={formatExpenseStatus(expense.status)}
          tone={getStatusBadgeTone(expense.status)}
        />
        {expense.receipt_image_url ? (
          <AdminBadge label="レシートあり" tone="primary" />
        ) : (
          <AdminBadge label="レシートなし" tone="danger" />
        )}
      </View>

      <View style={styles.metaRow}>
        <AdminMeta
          label="支払者"
          value={expense.payer_display_name || expense.payer_email || '未設定'}
        />
        <AdminMeta label="対象者" value={formatTargets(expense)} />
      </View>
    </Pressable>
  );
}

export function AdminRoomManagementItem({
  dashboard,
}: {
  dashboard: AdminRoomDashboard;
}) {
  const router = useRouter();
  const theme = useTheme();
  const summary = summarizeExpenses(dashboard.expenses);
  const pendingCount = dashboard.expenses.filter(
    (expense) => expense.status === 'pending',
  ).length;
  const rejectedCount = dashboard.expenses.filter(
    (expense) => expense.status === 'rejected',
  ).length;
  const joinedCount = dashboard.members.filter(
    (member) => member.status === 'joined',
  ).length;
  const adminCount = dashboard.members.filter(
    (member) => member.role === 'admin',
  ).length;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.roomItem, { borderColor: theme.border }, Shadows.card]}
    >
      <View style={styles.roomIdentity}>
        <View style={[styles.roomIcon, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            name={{
              ios: 'person.3.fill',
              android: 'groups',
              web: 'groups',
            }}
            size={20}
            tintColor={theme.primary}
            fallback={
              <Text style={[styles.iconFallback, { color: theme.primary }]}>
                R
              </Text>
            }
          />
        </View>
        <View style={styles.roomTitleGroup}>
          <ThemedText type="smallBold" style={styles.roomTitle}>
            {dashboard.room.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {dashboard.room.description || '説明はまだ登録されていません。'}
          </ThemedText>
        </View>
      </View>

      <View
        style={[styles.roomStats, { backgroundColor: theme.overBackground }]}
      >
        <AdminMeta label="支出合計" value={formatCurrency(summary.total)} />
        <AdminMeta label="未確認" value={`${pendingCount}件`} />
        <AdminMeta label="差し戻し" value={`${rejectedCount}件`} />
        <AdminMeta
          label="参加者"
          value={`${dashboard.members.length}名（参加中${joinedCount}名）`}
        />
        <AdminMeta label="admin" value={`${adminCount}名`} />
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push(`/rooms/${dashboard.room.id}` as never)}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            支出一覧
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push(`/rooms/${dashboard.room.id}/members` as never)
          }
          style={({ pressed }) => [
            styles.secondaryActionButton,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            参加者管理
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push(`/rooms/${dashboard.room.id}/expenses/new` as never)
          }
          style={({ pressed }) => [
            styles.primaryActionButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={styles.primaryActionButtonText}>
            支出登録
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export function AdminMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

export function AdminBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'neutral' | 'primary';
}) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'primary' ? theme.primarySoft : theme.backgroundSelected;
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

function AdminExpenseHeader({ item }: { item: AdminExpenseItem }) {
  const expense = item.expense;

  return (
    <View style={styles.reviewHeader}>
      <View style={styles.reviewTitleGroup}>
        <ThemedText type="smallBold" style={styles.reviewTitle}>
          {expense.description}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.room.name}・{expense.paid_at}・{expense.category}
        </ThemedText>
      </View>
      <ThemedText type="default" style={styles.amountText}>
        {formatCurrency(expense.amount)}
      </ThemedText>
    </View>
  );
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}

export function formatExpenseStatus(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    approved: '承認済み',
    pending: '未確認',
    rejected: '差し戻し',
    settled: '精算済み',
  };

  return labels[status] ?? status;
}

export function formatExpenseType(
  expenseType: AdminExpenseItem['expense']['expense_type'],
) {
  return expenseType === 'common' ? '共通経費' : '個人間立替';
}

export function getStatusBadgeTone(status: ExpenseStatus) {
  if (status === 'approved') {
    return 'primary';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'neutral';
}

function formatTargets(expense: AdminExpenseItem['expense']) {
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

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  backLink: {
    minHeight: 32,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  summaryTile: {
    minWidth: 220,
    flex: 1,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  summaryTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryTileBody: {
    gap: Spacing.one,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  iconFallback: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryValue: {
    fontWeight: '700',
  },
  reviewItem: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  reviewTitleGroup: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  reviewTitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  amountText: {
    fontWeight: '700',
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    minWidth: 136,
    flex: 1,
    gap: Spacing.one,
  },
  noReceiptBox: {
    gap: Spacing.one,
    borderRadius: Radius.panel,
    padding: Spacing.two,
  },
  textArea: {
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryActionButton: {
    minHeight: 44,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
  },
  primaryActionButtonText: {
    color: '#ffffff',
  },
  secondaryActionButton: {
    minHeight: 44,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
  },
  roomItem: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  roomIdentity: {
    minWidth: 0,
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
  roomTitleGroup: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  roomTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  roomStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderRadius: Radius.panel,
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.62,
  },
});
