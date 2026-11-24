-- A paired device acts as the same household member, so it may rename that member too.
create or replace function public.is_own_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where id = target_member_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.household_member_devices
    where member_id = target_member_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_own_member(uuid) to authenticated, service_role;

drop policy if exists "members can update their own nickname" on public.household_members;
create policy "members can update their own nickname"
  on public.household_members for update
  using (public.is_own_member(id))
  with check (public.is_own_member(id));
