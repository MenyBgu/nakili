-- Table privileges for the Supabase API roles. RLS still decides which rows are visible.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.households,
  public.household_members,
  public.chores,
  public.chore_schedules,
  public.chore_completions
to authenticated, service_role;

grant all privileges on public.household_access_codes to service_role;
revoke all on public.household_access_codes from anon, authenticated;

grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on function public.is_household_member(uuid) to authenticated, service_role;
grant execute on function public.is_household_owner(uuid) to authenticated, service_role;

-- Anonymous visitors without a session never touch household data directly.
revoke all on
  public.households,
  public.household_members,
  public.chores,
  public.chore_schedules,
  public.chore_completions
from anon;

-- Households and memberships are created only by the server (service role).
-- Members may rename themselves; owners may edit household settings. Nothing else.
revoke insert, update, delete on public.households, public.household_members from authenticated;
grant update (nickname) on public.household_members to authenticated;
grant update (name, week_start, timezone, updated_at) on public.households to authenticated;

drop policy if exists "members can update their own nickname" on public.household_members;
create policy "members can update their own nickname"
  on public.household_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "members can update their household" on public.households;
create policy "owners can update their household"
  on public.households for update
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));
