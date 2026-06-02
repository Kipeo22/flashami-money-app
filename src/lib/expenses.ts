import {
  ensureCurrentUserRoomMembership,
  fetchRoomMembers,
  formatSupabaseError,
  isValidIsoDate,
  requireAuthenticatedUser,
  type RoomMemberRecord,
} from '@/lib/rooms';
import { getSupabaseClient } from '@/lib/supabase';

export type ExpenseType = 'common' | 'personal';
export type SplitType = 'equal' | 'custom';

export type ExpenseTargetInput = {
  amountShare: number | null;
  member: RoomMemberRecord;
};

type CreateExpenseInput = {
  amount: number;
  category: string;
  description: string;
  expenseType: ExpenseType;
  noReceiptNote: string;
  noReceiptReason: string;
  paidAt: string;
  receiptImageUrl: string;
  roomId: string;
  splitType: SplitType | null;
  targets: ExpenseTargetInput[];
};

export type ExpenseRecord = {
  id: string;
  room_id: string;
  expense_type: ExpenseType;
  amount: number;
  category: string;
  description: string;
  paid_at: string;
  receipt_image_url: string | null;
  no_receipt_reason: string | null;
  no_receipt_note: string | null;
  split_type: SplitType | null;
  status: string;
};

export function validateExpenseInput(input: CreateExpenseInput) {
  if (!input.roomId) {
    return 'roomId が指定されていません。';
  }

  if (input.amount < 1 || !Number.isInteger(input.amount)) {
    return '金額は1円以上の整数で入力してください。';
  }

  if (!input.category.trim()) {
    return 'カテゴリを入力してください。';
  }

  if (!input.description.trim()) {
    return '内容を入力してください。';
  }

  if (!isValidIsoDate(input.paidAt)) {
    return '支払日は YYYY-MM-DD 形式で入力してください。';
  }

  if (!input.receiptImageUrl.trim()) {
    if (!input.noReceiptReason.trim()) {
      return 'レシート画像がない場合はレシートなし理由を入力してください。';
    }

    if (!input.noReceiptNote.trim()) {
      return 'レシート画像がない場合は補足メモを入力してください。';
    }
  }

  if (input.expenseType === 'personal') {
    if (input.targets.length === 0) {
      return '個人間立替の場合は対象者を1人以上選択してください。';
    }

    if (!input.splitType) {
      return '個人間立替の場合は割り方を選択してください。';
    }

    if (
      input.splitType === 'custom' &&
      input.targets.some(
        (target) =>
          target.amountShare === null ||
          target.amountShare < 1 ||
          !Number.isInteger(target.amountShare),
      )
    ) {
      return '金額指定の場合は対象者ごとの金額を1円以上の整数で入力してください。';
    }

    if (input.splitType === 'custom') {
      const targetTotal = input.targets.reduce(
        (total, target) => total + (target.amountShare ?? 0),
        0,
      );

      if (targetTotal !== input.amount) {
        return '金額指定の場合は対象者ごとの金額合計を支出金額と一致させてください。';
      }
    }
  }

  return null;
}

export async function createExpenseWithTargets(input: CreateExpenseInput) {
  const validationError = validateExpenseInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  await ensureCurrentUserRoomMembership(input.roomId);

  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();
  const receiptImageUrl = input.receiptImageUrl.trim() || null;

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      room_id: input.roomId,
      payer_id: user.id,
      expense_type: input.expenseType,
      amount: input.amount,
      category: input.category.trim(),
      description: input.description.trim(),
      paid_at: input.paidAt,
      receipt_image_url: receiptImageUrl,
      no_receipt_reason: receiptImageUrl ? null : input.noReceiptReason.trim(),
      no_receipt_note: receiptImageUrl ? null : input.noReceiptNote.trim(),
      split_type: input.expenseType === 'personal' ? input.splitType : null,
      created_by: user.id,
    })
    .select(
      'id, room_id, expense_type, amount, category, description, paid_at, receipt_image_url, no_receipt_reason, no_receipt_note, split_type, status',
    )
    .single<ExpenseRecord>();

  if (expenseError) {
    throw new Error(formatSupabaseError(expenseError));
  }

  if (input.expenseType !== 'personal') {
    return expense;
  }

  const targetsToInsert = input.targets.map(({ amountShare, member }) => ({
    expense_id: expense.id,
    user_id: member.user_id,
    email: member.email,
    display_name: member.display_name,
    amount_share: input.splitType === 'custom' ? amountShare : null,
  }));

  const { error: targetsError } = await supabase
    .from('expense_targets')
    .insert(targetsToInsert);

  if (targetsError) {
    await supabase.from('expenses').delete().eq('id', expense.id);
    throw new Error(formatSupabaseError(targetsError));
  }

  return expense;
}

export async function fetchExpenseTargetCandidates(roomId: string) {
  await ensureCurrentUserRoomMembership(roomId);
  return fetchRoomMembers(roomId);
}
