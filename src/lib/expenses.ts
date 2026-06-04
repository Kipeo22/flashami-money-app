import {
  ensureCurrentUserRoomMembership,
  fetchRoomMembers,
  formatSupabaseError,
  isValidIsoDate,
  requireCurrentUserRoomAdmin,
  requireAuthenticatedUser,
  type RoomMemberRole,
  type RoomMemberRecord,
} from '@/lib/rooms';
import { getSupabaseClient } from '@/lib/supabase';

export type ExpenseType = 'common' | 'personal';
export type SplitType = 'equal' | 'custom';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'settled';

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
  receiptImageBase64?: string | null;
  receiptImageUrl: string;
  roomId: string;
  splitType: SplitType | null;
  targets: ExpenseTargetInput[];
};

export type ExpenseRecord = {
  id: string;
  room_id: string;
  payer_id: string | null;
  expense_type: ExpenseType;
  amount: number;
  category: string;
  description: string;
  paid_at: string;
  receipt_image_url: string | null;
  no_receipt_reason: string | null;
  no_receipt_note: string | null;
  rejection_reason: string | null;
  split_type: SplitType | null;
  status: ExpenseStatus;
  created_at: string;
};

export type ExpenseTargetRecord = {
  id: string;
  expense_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  amount_share: number | null;
};

export type ExpenseListItem = ExpenseRecord & {
  payer_display_name: string | null;
  payer_email: string | null;
  target_count: number;
  target_labels: string[];
};

export type ExpenseDetailRecord = ExpenseRecord & {
  current_user_role: RoomMemberRole;
  payer_display_name: string | null;
  payer_email: string | null;
  targets: ExpenseTargetRecord[];
};

const EXPENSE_SELECT =
  'id, room_id, payer_id, expense_type, amount, category, description, paid_at, receipt_image_url, no_receipt_reason, no_receipt_note, rejection_reason, split_type, status, created_at';

const RECEIPTS_BUCKET = 'receipts';
const RECEIPT_IMAGE_CONTENT_TYPE = 'image/jpeg';
const RECEIPT_IMAGE_EXTENSION = 'jpg';
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

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

  const hasReceiptImage = Boolean(
    input.receiptImageUrl.trim() || input.receiptImageBase64?.trim(),
  );

  if (!hasReceiptImage) {
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
  const receiptImageBase64 = input.receiptImageBase64?.trim() || null;
  const hasReceiptImage = Boolean(receiptImageUrl || receiptImageBase64);

  let { data: expense, error: expenseError } = await supabase
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
      no_receipt_reason: hasReceiptImage ? null : input.noReceiptReason.trim(),
      no_receipt_note: hasReceiptImage ? null : input.noReceiptNote.trim(),
      split_type: input.expenseType === 'personal' ? input.splitType : null,
      created_by: user.id,
    })
    .select(EXPENSE_SELECT)
    .single<ExpenseRecord>();

  if (expenseError || !expense) {
    throw new Error(
      expenseError
        ? formatSupabaseError(expenseError)
        : '支出の登録に失敗しました。',
    );
  }

  let uploadedReceiptPath: string | null = null;

  if (receiptImageBase64) {
    try {
      const upload = await uploadReceiptImage({
        base64: receiptImageBase64,
        expenseId: expense.id,
        roomId: input.roomId,
      });

      uploadedReceiptPath = upload.path;

      const { data: updatedExpense, error: updateError } = await supabase
        .from('expenses')
        .update({ receipt_image_url: upload.publicUrl })
        .eq('id', expense.id)
        .select(EXPENSE_SELECT)
        .single<ExpenseRecord>();

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      expense = updatedExpense;
    } catch (error) {
      await cleanupFailedExpense(expense.id, uploadedReceiptPath);
      throw error;
    }
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
    await cleanupFailedExpense(expense.id, uploadedReceiptPath);
    throw new Error(formatSupabaseError(targetsError));
  }

  return expense;
}

export async function fetchExpenseById(roomId: string, expenseId: string) {
  const currentMembership = await ensureCurrentUserRoomMembership(roomId);

  const supabase = getSupabaseClient();
  const [{ data, error }, members] = await Promise.all([
    supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('room_id', roomId)
      .eq('id', expenseId)
      .single<ExpenseRecord>(),
    fetchRoomMembers(roomId),
  ]);

  if (error || !data) {
    throw new Error(
      error ? formatSupabaseError(error) : '支出情報を取得できませんでした。',
    );
  }

  const { data: targets, error: targetsError } = await supabase
    .from('expense_targets')
    .select('id, expense_id, user_id, email, display_name, amount_share')
    .eq('expense_id', expenseId)
    .returns<ExpenseTargetRecord[]>();

  if (targetsError) {
    throw new Error(formatSupabaseError(targetsError));
  }

  return {
    ...data,
    current_user_role: currentMembership.role,
    ...findPayerDisplay(data.payer_id, members),
    targets,
  } satisfies ExpenseDetailRecord;
}

export async function updateExpenseReviewStatus({
  expenseId,
  rejectionReason,
  roomId,
  status,
}: {
  expenseId: string;
  rejectionReason?: string;
  roomId: string;
  status: Extract<ExpenseStatus, 'approved' | 'rejected'>;
}) {
  await requireCurrentUserRoomAdmin(roomId);

  const normalizedRejectionReason = rejectionReason?.trim() ?? '';
  if (status === 'rejected' && !normalizedRejectionReason) {
    throw new Error('差し戻し理由を入力してください。');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('expenses')
    .update({
      rejection_reason:
        status === 'rejected' ? normalizedRejectionReason : null,
      status,
    })
    .eq('room_id', roomId)
    .eq('id', expenseId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return fetchExpenseById(roomId, expenseId);
}

export async function fetchRoomExpenses(roomId: string) {
  await ensureCurrentUserRoomMembership(roomId);

  const supabase = getSupabaseClient();
  const [{ data: expenses, error: expensesError }, members] = await Promise.all(
    [
      supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('room_id', roomId)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })
        .returns<ExpenseRecord[]>(),
      fetchRoomMembers(roomId),
    ],
  );

  if (expensesError) {
    throw new Error(formatSupabaseError(expensesError));
  }

  if (expenses.length === 0) {
    return [];
  }

  const expenseIds = expenses.map((expense) => expense.id);
  const { data: targets, error: targetsError } = await supabase
    .from('expense_targets')
    .select('id, expense_id, user_id, email, display_name, amount_share')
    .in('expense_id', expenseIds)
    .returns<ExpenseTargetRecord[]>();

  if (targetsError) {
    throw new Error(formatSupabaseError(targetsError));
  }

  const targetsByExpenseId = new Map<string, ExpenseTargetRecord[]>();
  for (const target of targets) {
    targetsByExpenseId.set(target.expense_id, [
      ...(targetsByExpenseId.get(target.expense_id) ?? []),
      target,
    ]);
  }

  return expenses.map((expense) => {
    const expenseTargets = targetsByExpenseId.get(expense.id) ?? [];

    return {
      ...expense,
      ...findPayerDisplay(expense.payer_id, members),
      target_count: expenseTargets.length,
      target_labels: expenseTargets.map(formatTargetLabel),
    } satisfies ExpenseListItem;
  });
}

export function summarizeExpenses(expenses: ExpenseRecord[]) {
  return expenses.reduce(
    (summary, expense) => {
      summary.total += expense.amount;

      if (expense.expense_type === 'common') {
        summary.common += expense.amount;
        return summary;
      }

      summary.personal += expense.amount;
      return summary;
    },
    { common: 0, personal: 0, total: 0 },
  );
}

function findPayerDisplay(payerId: string | null, members: RoomMemberRecord[]) {
  const payer = payerId
    ? members.find((member) => member.user_id === payerId)
    : undefined;

  return {
    payer_display_name: payer?.display_name ?? null,
    payer_email: payer?.email ?? null,
  };
}

function formatTargetLabel(target: ExpenseTargetRecord) {
  const name = target.display_name || target.email || '対象者未設定';
  return target.amount_share ? `${name}（${target.amount_share}円）` : name;
}

async function uploadReceiptImage({
  base64,
  expenseId,
  roomId,
}: {
  base64: string;
  expenseId: string;
  roomId: string;
}) {
  const supabase = getSupabaseClient();
  const path = `${roomId}/${expenseId}.${RECEIPT_IMAGE_EXTENSION}`;
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, decodeBase64ToArrayBuffer(base64), {
      cacheControl: '3600',
      contentType: RECEIPT_IMAGE_CONTENT_TYPE,
      upsert: false,
    });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error('レシート画像の公開URLを取得できませんでした。');
  }

  return { path, publicUrl: data.publicUrl };
}

async function cleanupFailedExpense(
  expenseId: string,
  uploadedReceiptPath: string | null,
) {
  const supabase = getSupabaseClient();

  try {
    if (uploadedReceiptPath) {
      await supabase.storage
        .from(RECEIPTS_BUCKET)
        .remove([uploadedReceiptPath]);
    }

    await supabase.from('expenses').delete().eq('id', expenseId);
  } catch {
    // Keep the original registration error as the caller-visible failure.
  }
}

function decodeBase64ToArrayBuffer(base64: string) {
  const normalizedBase64 = base64
    .replace(/^data:[^,]+,/, '')
    .replace(/\s/g, '');
  const paddingLength = normalizedBase64.endsWith('==')
    ? 2
    : normalizedBase64.endsWith('=')
      ? 1
      : 0;
  const byteLength =
    Math.floor((normalizedBase64.length * 3) / 4) - paddingLength;
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;

  for (let index = 0; index < normalizedBase64.length; index += 4) {
    const first = readBase64Value(normalizedBase64[index]);
    const second = readBase64Value(normalizedBase64[index + 1]);
    const third = readBase64Value(normalizedBase64[index + 2] ?? '=');
    const fourth = readBase64Value(normalizedBase64[index + 3] ?? '=');

    if (byteIndex < byteLength) {
      bytes[byteIndex] = (first << 2) | (second >> 4);
      byteIndex += 1;
    }

    if (byteIndex < byteLength) {
      bytes[byteIndex] = ((second & 15) << 4) | (third >> 2);
      byteIndex += 1;
    }

    if (byteIndex < byteLength) {
      bytes[byteIndex] = ((third & 3) << 6) | fourth;
      byteIndex += 1;
    }
  }

  return bytes.buffer;
}

function readBase64Value(character: string) {
  if (character === '=') {
    return 0;
  }

  const value = BASE64_ALPHABET.indexOf(character);

  if (value === -1) {
    throw new Error('レシート画像データの読み込みに失敗しました。');
  }

  return value;
}

export async function fetchExpenseTargetCandidates(roomId: string) {
  await ensureCurrentUserRoomMembership(roomId);
  return fetchRoomMembers(roomId);
}
