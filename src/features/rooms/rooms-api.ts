import type { User } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomMemberRow = Database['public']['Tables']['room_members']['Row'];

type RoomMemberMaybeRoom = Pick<
  RoomMemberRow,
  'id' | 'room_id' | 'role' | 'status' | 'display_name'
> & {
  room: RoomRow | null;
};

type RoomMemberWithRoom = Omit<RoomMemberMaybeRoom, 'room'> & {
  room: RoomRow;
};

export type RoomListItem = {
  membershipId: string;
  role: RoomMemberRow['role'];
  status: RoomMemberRow['status'];
  displayName: string | null;
  expenseCount: number;
  room: RoomRow;
};

export type RoomDetail = RoomListItem;

export async function claimCurrentUserRoomInvites(user: User) {
  if (!user.email) {
    return;
  }

  const client = getSupabaseClient();
  const profileDisplayName =
    typeof user.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : null;

  const { error } = await client.rpc('claim_my_room_memberships', {
    profile_display_name: profileDisplayName,
  });

  if (error) {
    throw error;
  }
}

export async function fetchCurrentUserRooms(
  user: User,
): Promise<RoomListItem[]> {
  await claimCurrentUserRoomInvites(user);

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('room_members')
    .select(
      `
        id,
        room_id,
        role,
        status,
        display_name,
        room:rooms (
          id,
          name,
          description,
          start_date,
          end_date,
          created_by,
          discord_webhook_url,
          spreadsheet_id,
          created_at
        )
      `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const memberships = ((data ?? []) as RoomMemberMaybeRoom[]).filter(
    (membership): membership is RoomMemberWithRoom => membership.room !== null,
  );
  const roomIds = memberships.map((membership) => membership.room.id);
  const expenseCountByRoom = new Map<string, number>();

  if (roomIds.length > 0) {
    const { data: expenses, error: expensesError } = await client
      .from('expenses')
      .select('room_id')
      .in('room_id', roomIds);

    if (expensesError) {
      throw expensesError;
    }

    for (const expense of expenses ?? []) {
      expenseCountByRoom.set(
        expense.room_id,
        (expenseCountByRoom.get(expense.room_id) ?? 0) + 1,
      );
    }
  }

  return memberships.map((membership) => ({
    membershipId: membership.id,
    role: membership.role,
    status: membership.status,
    displayName: membership.display_name,
    expenseCount: expenseCountByRoom.get(membership.room.id) ?? 0,
    room: membership.room,
  }));
}

export async function fetchCurrentUserRoomDetail(
  user: User,
  roomId: string,
): Promise<RoomDetail | null> {
  const rooms = await fetchCurrentUserRooms(user);
  const room = rooms.find((item) => item.room.id === roomId);

  if (!room) {
    return null;
  }

  return room;
}

export function formatRoomPeriod(room: RoomRow) {
  if (!room.start_date && !room.end_date) {
    return '日程未定';
  }

  if (room.start_date && room.end_date) {
    if (room.start_date === room.end_date) {
      return formatDate(room.start_date);
    }

    return `${formatDate(room.start_date)} - ${formatDate(room.end_date)}`;
  }

  return formatDate(room.start_date ?? room.end_date ?? '');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00+09:00`));
}
