import {
  fetchRoomMembers,
  isValidIsoDate,
  requireAuthenticatedUser,
} from '@/lib/rooms';
import { getSupabaseClient } from '@/lib/supabase';

export const EXPENSE_TYPE_OPTIONS = [
  { label: '共通経費', value: 'common' },
  { label: '個人間立替', value: 'personal' },
] as const;

export const SPLIT_TYPE_OPTIONS = [
  { label: '均等', value: 'equal' },
  { label: '金額指定', value: 'custom' },
] as const;

export const NO_RECEIPT_REASON_OPTIONS = [
  'レシートが発行されなかった',
  'レシートをもらい忘れた',
  '交通費のためレシートがない',
  '個人間送金のためレシートがない',
  'その他',
] as const;

export const EXPENSE_CATEGORY_OPTIONS = [
  '宿泊費',
  '交通費',
  '食費',
  '会場費',
  '備品代',
  'レンタカー代',
  'その他',
] as const;

export type ExpenseType = (typeof EXPENSE_TYPE_OPTIONS)[number]['value'];
export type SplitType = (typeof SPLIT_TYPE_OPTIONS)[number]['value'];
export type NoReceiptReason = (typeof NO_RECEIPT_REASON_OPTIONS)[number];

export type ExpenseTargetInput = {
  amountShare: number | null;
  displayName: string | null;
  email: string;
  userId: string | null;
};

export type CreateExpenseInput = {
  amount: number;
  category: string;
  description: string;
  expenseType: ExpenseType;
  noReceiptNote: string;
  noReceiptReason: string;
  paidAt: string;
  receiptImageUrl: string | null;
  roomId: string;
  splitType: SplitType;
  targets: ExpenseTargetInput[];
};

type ExpenseInsert = {
  amount: number;
  category: string;
  created_by: string;
  description: string;
  expense_type: ExpenseType;
  no_receipt_note: string | null;
  no_receipt_reason: string | null;
  paid_at: string;
  payer_id: string;
  receipt_image_url: string | null;
  room_id: string;
  split_type: SplitType | null;
  status: 'pending';
};

type ExpenseRecord = {
  id: string;
};

function normalizeAmount(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }

  return value;
}

export function buildEqualShares(amount: number, targetCount: number) {
  if (targetCount < 1) {
    return [];
  }

  const base = Math.floor(amount / targetCount);
  const remainder = amount % targetCount;

  return Array.from(
    { length: targetCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export function validateExpenseInput(input: CreateExpenseInput) {
  if (!input.roomId) {
    return 'roomId が指定されていません。';
  }

  if (!normalizeAmount(input.amount)) {
    return '金額は1円以上の整数で入力してください。';
  }

  if (!input.category.trim()) {
    return 'カテゴリを選択してください。';
  }

  if (!input.description.trim()) {
    return '内容を入力してください。';
  }

  if (!isValidIsoDate(input.paidAt)) {
    return '支払日は YYYY-MM-DD 形式で入力してください。';
  }

  if (!input.receiptImageUrl) {
    if (!input.noReceiptReason.trim()) {
      return 'レシートなし理由を入力してください。';
    }

    if (!input.noReceiptNote.trim()) {
      return 'レシートがない場合は補足メモを入力してください。';
    }
  }

  if (input.expenseType === 'personal') {
    if (input.targets.length < 1) {
      return '個人間立替では対象者を1人以上選択してください。';
    }

    if (input.splitType === 'custom') {
      const invalidTarget = input.targets.find(
        (target) => !target.amountShare || target.amountShare < 1,
      );

      if (invalidTarget) {
        return '金額指定では各対象者の負担額を1円以上で入力してください。';
      }

      const totalShare = input.targets.reduce(
        (sum, target) => sum + (target.amountShare ?? 0),
        0,
      );

      if (totalShare !== input.amount) {
        return '金額指定の合計は支出金額と一致させてください。';
      }
    }
  }

  return null;
}

function buildExpenseInsert(
  input: CreateExpenseInput,
  userId: string,
): ExpenseInsert {
  return {
    room_id: input.roomId,
    payer_id: userId,
    expense_type: input.expenseType,
    amount: input.amount,
    category: input.category.trim(),
    description: input.description.trim(),
    paid_at: input.paidAt,
    receipt_image_url: input.receiptImageUrl,
    no_receipt_reason: input.receiptImageUrl
      ? null
      : input.noReceiptReason.trim(),
    no_receipt_note: input.receiptImageUrl ? null : input.noReceiptNote.trim(),
    split_type: input.expenseType === 'personal' ? input.splitType : null,
    status: 'pending',
    created_by: userId,
  };
}

function buildTargetShares(input: CreateExpenseInput) {
  if (input.expenseType !== 'personal') {
    return [];
  }

  const equalShares = buildEqualShares(input.amount, input.targets.length);

  return input.targets.map((target, index) => ({
    user_id: target.userId,
    email: target.email,
    display_name: target.displayName,
    amount_share:
      input.splitType === 'custom'
        ? target.amountShare
        : (equalShares[index] ?? null),
  }));
}

export async function createExpense(input: CreateExpenseInput) {
  const validationError = validateExpenseInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert(buildExpenseInsert(input, user.id))
    .select('id')
    .single<ExpenseRecord>();

  if (expenseError) {
    throw expenseError;
  }

  const targets = buildTargetShares(input);

  if (targets.length > 0) {
    const { error: targetsError } = await supabase
      .from('expense_targets')
      .insert(
        targets.map((target) => ({
          expense_id: expense.id,
          user_id: target.user_id,
          email: target.email,
          display_name: target.display_name,
          amount_share: target.amount_share,
        })),
      );

    if (targetsError) {
      throw targetsError;
    }
  }

  return expense;
}

export async function fetchExpenseTargetCandidates(roomId: string) {
  const members = await fetchRoomMembers(roomId);

  return members.map((member) => ({
    id: member.id,
    userId: member.user_id,
    email: member.email,
    displayName: member.display_name,
    role: member.role,
    status: member.status,
  }));
}
