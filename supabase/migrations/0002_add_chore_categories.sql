alter table public.chores
  add column category text not null default 'cleaning'
  check (category in ('cleaning', 'errand', 'organization', 'maintenance', 'other'));

comment on column public.chores.category is
  'General household task category: cleaning, errand, organization, maintenance or other.';
