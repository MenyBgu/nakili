-- Expand recurring task options without deleting any existing tasks.
-- The frequency column becomes text so future recurrence options can be added
-- without replacing the database enum again.
alter table public.chore_schedules
  alter column frequency drop default;

alter table public.chore_schedules
  alter column frequency type text using frequency::text;

drop type public.chore_frequency;

alter table public.chore_schedules
  alter column frequency set default 'weekly';

alter table public.chore_schedules
  drop constraint if exists chore_schedules_check,
  drop constraint if exists chore_schedules_weekdays_check;

alter table public.chore_schedules
  add constraint chore_schedules_frequency_check
    check (frequency in ('weekly', 'biweekly', 'monthly', 'one_off')),
  add constraint chore_schedules_weekdays_check
    check (
      frequency in ('monthly', 'one_off')
      or coalesce(cardinality(weekdays), 0) > 0
    ),
  add constraint chore_schedules_dates_check
    check (
      (frequency = 'one_off' and one_off_date is not null)
      or (frequency <> 'one_off' and one_off_date is null)
    );
