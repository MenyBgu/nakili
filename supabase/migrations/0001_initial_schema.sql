create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'member');
create type public.chore_frequency as enum ('weekly', 'one_off');
create type public.completion_status as enum ('completed', 'skipped');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  owner_id uuid not null references auth.users (id) on delete restrict,
  timezone text not null default 'Asia/Jerusalem',
  week_start smallint not null default 0 check (week_start in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 40),
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);

create table public.household_access_codes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index household_access_codes_one_active
  on public.household_access_codes (household_id)
  where revoked_at is null;

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 240),
  icon text not null default '🧽' check (char_length(icon) <= 8),
  color text not null default '#dcefe1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  assigned_member_id uuid references public.household_members (id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chore_schedules (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null unique references public.chores (id) on delete cascade,
  frequency public.chore_frequency not null default 'weekly',
  weekdays smallint[] not null default '{}',
  one_off_date date,
  start_date date,
  end_date date,
  check (array_position(weekdays, 0) is not null or array_position(weekdays, 1) is not null or
    array_position(weekdays, 2) is not null or array_position(weekdays, 3) is not null or
    array_position(weekdays, 4) is not null or array_position(weekdays, 5) is not null or
    array_position(weekdays, 6) is not null or frequency = 'one_off'),
  check ((frequency = 'one_off' and one_off_date is not null) or
    (frequency = 'weekly' and one_off_date is null))
);

create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  chore_id uuid not null references public.chores (id) on delete cascade,
  occurrence_date date not null,
  status public.completion_status not null,
  completed_by uuid references public.household_members (id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (chore_id, occurrence_date)
);

create index chores_household_sort_idx on public.chores (household_id, sort_order);
create index completions_household_date_idx on public.chore_completions (household_id, occurrence_date);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_access_codes enable row level security;
alter table public.chores enable row level security;
alter table public.chore_schedules enable row level security;
alter table public.chore_completions enable row level security;

create policy "members can read their household"
  on public.households for select using (public.is_household_member(id));
create policy "members can update their household"
  on public.households for update using (public.is_household_owner(id));

create policy "members can read household members"
  on public.household_members for select using (public.is_household_member(household_id));
create policy "members can update their own nickname"
  on public.household_members for update using (user_id = auth.uid());

create policy "members can manage chores"
  on public.chores for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members can manage schedules"
  on public.chore_schedules for all using (
    exists (
      select 1 from public.chores c
      where c.id = chore_id and public.is_household_member(c.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.chores c
      where c.id = chore_id and public.is_household_member(c.household_id)
    )
  );

create policy "members can manage completions"
  on public.chore_completions for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_touch_updated_at
before update on public.households
for each row execute function public.touch_updated_at();

create trigger chores_touch_updated_at
before update on public.chores
for each row execute function public.touch_updated_at();
