-- pantry_items: what a user actually has on hand. Feeds recipe generation
-- ("use freely") and powers "what can I make right now" (v2 backlog).
create table public.pantry_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       extensions.citext not null check (char_length(name) between 1 and 80),
  quantity   numeric(10, 2) check (quantity > 0),
  unit       text check (char_length(unit) <= 20),
  category   text check (char_length(category) <= 40),
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)   -- citext makes this case-insensitive
);

create index pantry_user_idx on public.pantry_items (user_id, name);

create trigger pantry_items_set_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();
