-- Adds the "shopping" category (a numbered shopping list) and lets the description hold the list.
alter table public.chores drop constraint if exists chores_category_check;
alter table public.chores
  add constraint chores_category_check
  check (category in ('cleaning', 'errand', 'organization', 'maintenance', 'other', 'shopping'));

alter table public.chores drop constraint if exists chores_description_check;
alter table public.chores
  add constraint chores_description_check
  check (char_length(description) <= 2000);

comment on column public.chores.category is
  'General household task category: cleaning, errand, organization, maintenance, shopping or other.';
