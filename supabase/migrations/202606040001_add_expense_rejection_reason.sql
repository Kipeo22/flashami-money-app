alter table public.expenses
  add column if not exists rejection_reason text;
