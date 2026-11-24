-- Household members may exist without a device (for example children who get tasks).
-- Such a profile has no user_id until someone joins with the household code and the same name.
alter table public.household_members alter column user_id drop not null;
