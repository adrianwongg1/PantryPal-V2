-- Extensions and shared enums used across every table below.
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.meal_type as enum (
  'breakfast', 'lunch', 'dinner', 'snack', 'dessert'
);

create type public.difficulty as enum ('easy', 'medium', 'hard');

create type public.recipe_source as enum ('generated', 'manual', 'imported');

create type public.visibility as enum ('private', 'unlisted', 'public');

create type public.diet_tag as enum (
  'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher',
  'gluten_free', 'dairy_free', 'nut_free', 'low_carb',
  'keto', 'paleo', 'low_sodium'
);
