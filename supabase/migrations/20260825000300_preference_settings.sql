-- Backs the Settings tab (design canvas 6c): appearance, units, two nudge
-- toggles, and the default visibility new recipes are created with.
--
-- notify_expiring / notify_weekly_plan are stored preferences only — no
-- delivery mechanism (email/push, a scheduled job) exists yet, so the
-- Settings UI that reads/writes these must say so rather than implying the
-- nudges actually fire. Wiring delivery is a later phase's job, not this
-- migration's.
create type public.units_system     as enum ('metric', 'imperial');
create type public.theme_preference as enum ('system', 'light', 'dark');

alter table public.user_preferences
  add column units               public.units_system     not null default 'metric',
  add column theme               public.theme_preference  not null default 'system',
  add column notify_expiring     boolean not null default true,
  add column notify_weekly_plan  boolean not null default false,
  add column default_visibility  public.visibility not null default 'private';
