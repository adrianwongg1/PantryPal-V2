-- Splits pantry_items into Have/Need — the design canvas's shopping list
-- (5a-5c) lives inside Pantry as a status flag on the same table, not a
-- separate one: same nav item, same table, one flag apart.
--
-- The existing `unique (user_id, name)` would forbid the same ingredient
-- name existing in both states at once (e.g. a "running low" Have row plus
-- a Need row raised to top it up) — widened to (user_id, name, status)
-- here, while the table is still empty, since narrowing a unique
-- constraint later against live rows is a far more painful migration than
-- doing it now, before the shopping list UI (a later phase) needs it.
create type public.pantry_status as enum ('have', 'need');

alter table public.pantry_items
  add column status               public.pantry_status not null default 'have',
  add column low_stock            boolean not null default false,
  add column needed_for_recipe_id uuid references public.recipes(id) on delete set null;

alter table public.pantry_items drop constraint pantry_items_user_id_name_key;
alter table public.pantry_items
  add constraint pantry_items_user_id_name_status_key unique (user_id, name, status);

create index pantry_items_needed_for_recipe_idx
  on public.pantry_items (needed_for_recipe_id)
  where needed_for_recipe_id is not null;
