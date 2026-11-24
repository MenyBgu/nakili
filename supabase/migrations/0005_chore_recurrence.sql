-- Adds "every two weeks" and "every month" without touching existing tasks.
-- The old check constraints compare frequency with the enum, so they must go
-- before the column type can change.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.chore_schedules'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.chore_schedules drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.chore_schedules alter column frequency drop default;
alter table public.chore_schedules alter column frequency type text using frequency::text;
alter table public.chore_schedules alter column frequency set default 'weekly';
drop type if exists public.chore_frequency;

alter table public.chore_schedules
  add constraint chore_schedules_frequency_check
    check (frequency in ('weekly', 'biweekly', 'monthly', 'one_off')),
  add constraint chore_schedules_weekdays_check
    check (
      weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      and (frequency in ('monthly', 'one_off') or cardinality(weekdays) > 0)
    ),
  add constraint chore_schedules_dates_check
    check (
      (frequency = 'one_off' and one_off_date is not null)
      or (frequency in ('weekly', 'biweekly', 'monthly') and one_off_date is null)
    ),
  add constraint chore_schedules_start_check
    check (frequency in ('weekly', 'one_off') or start_date is not null);
