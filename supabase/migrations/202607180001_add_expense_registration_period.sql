alter table public.rooms
  add column if not exists expense_registration_start_date date,
  add column if not exists expense_registration_end_date date;

alter table public.rooms
  drop constraint if exists rooms_expense_registration_period_check;

alter table public.rooms
  add constraint rooms_expense_registration_period_check
  check (
    expense_registration_start_date is null
    or expense_registration_end_date is null
    or expense_registration_start_date <= expense_registration_end_date
  );

comment on column public.rooms.expense_registration_start_date is
  'First local calendar date on which participants may register expenses.';

comment on column public.rooms.expense_registration_end_date is
  'Last local calendar date on which participants may register expenses.';
