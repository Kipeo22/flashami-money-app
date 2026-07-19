import {
  fetchRoomExpenses,
  summarizeExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
} from '@/lib/expenses';
import {
  fetchCurrentUserRooms,
  fetchRoomMembers,
  type RoomMemberRecord,
  type UserRoomRecord,
} from '@/lib/rooms';

export type AdminRoomDashboard = {
  expenses: ExpenseListItem[];
  members: RoomMemberRecord[];
  room: UserRoomRecord;
};

export type AdminExpenseItem = {
  expense: ExpenseListItem;
  room: UserRoomRecord;
};

export type AdminDashboardSummary = {
  approved: number;
  expenses: number;
  members: number;
  pending: number;
  rejected: number;
  rooms: number;
  totalAmount: number;
};

export async function fetchAdminRoomDashboards() {
  const rooms = await fetchCurrentUserRooms();
  const roomsForAdmin = rooms.filter((room) => room.member_role === 'admin');

  return Promise.all(
    roomsForAdmin.map(async (room) => {
      const [expenses, members] = await Promise.all([
        fetchRoomExpenses(room.id),
        fetchRoomMembers(room.id),
      ]);

      return { expenses, members, room } satisfies AdminRoomDashboard;
    }),
  );
}

export function summarizeAdminDashboards(
  dashboards: AdminRoomDashboard[],
): AdminDashboardSummary {
  return dashboards.reduce(
    (summary, dashboard) => {
      const expenseSummary = summarizeExpenses(dashboard.expenses);
      summary.approved += dashboard.expenses.filter(
        (expense) => expense.status === 'approved',
      ).length;
      summary.expenses += dashboard.expenses.length;
      summary.members += dashboard.members.length;
      summary.pending += dashboard.expenses.filter(
        (expense) => expense.status === 'pending',
      ).length;
      summary.rejected += dashboard.expenses.filter(
        (expense) => expense.status === 'rejected',
      ).length;
      summary.rooms += 1;
      summary.totalAmount += expenseSummary.total;
      return summary;
    },
    {
      approved: 0,
      expenses: 0,
      members: 0,
      pending: 0,
      rejected: 0,
      rooms: 0,
      totalAmount: 0,
    },
  );
}

export function flattenAdminExpenses(
  dashboards: AdminRoomDashboard[],
  status?: ExpenseStatus,
) {
  const expenses = dashboards.flatMap((dashboard) =>
    dashboard.expenses
      .filter((expense) => (status ? expense.status === status : true))
      .map((expense) => ({
        expense,
        room: dashboard.room,
      })),
  );

  return sortAdminExpenses(expenses);
}

export function sortAdminExpenses(expenses: AdminExpenseItem[]) {
  return [...expenses].sort((firstExpense, secondExpense) => {
    const paidAtComparison = secondExpense.expense.paid_at.localeCompare(
      firstExpense.expense.paid_at,
    );

    return paidAtComparison !== 0
      ? paidAtComparison
      : secondExpense.expense.created_at.localeCompare(
          firstExpense.expense.created_at,
        );
  });
}
