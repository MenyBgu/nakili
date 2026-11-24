-- Allow one household member to use multiple anonymous sessions/devices.
create table public.household_member_devices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.household_members (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, user_id)
);

create index household_member_devices_member_idx
  on public.household_member_devices (member_id);

create table public.household_device_pairing_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.household_members (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create unique index household_device_pairing_tokens_one_active
  on public.household_device_pairing_tokens (member_id)
  where used_at is null;

alter table public.household_member_devices enable row level security;
alter table public.household_device_pairing_tokens enable row level security;

create policy "users can read their device links"
  on public.household_member_devices for select
  using (user_id = auth.uid());

grant select on public.household_member_devices to authenticated;
grant all privileges on public.household_member_devices to service_role;
grant all privileges on public.household_device_pairing_tokens to service_role;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id and user_id = auth.uid()
  ) or exists (
    select 1
    from public.household_member_devices d
    join public.household_members m on m.id = d.member_id
    where m.household_id = target_household_id and d.user_id = auth.uid()
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
    select 1
    from public.household_members
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  ) or exists (
    select 1
    from public.household_member_devices d
    join public.household_members m on m.id = d.member_id
    where m.household_id = target_household_id and d.user_id = auth.uid() and m.role = 'owner'
  );
$$;
