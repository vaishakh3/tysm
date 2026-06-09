-- Base creators table (already applied in production).
create extension if not exists pgcrypto;

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,29}$'),
  name text not null check (char_length(name) between 1 and 60),
  upi  text not null,
  bio  text check (char_length(bio) <= 120),
  emoji text,
  presets int[] not null default '{49,99,199}',
  created_at timestamptz not null default now()
);

alter table public.creators enable row level security;

create policy "public read" on public.creators for select using (true);
