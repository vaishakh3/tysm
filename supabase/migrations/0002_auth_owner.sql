-- Add account ownership to creators and lock writes down to the owner.
-- Run once in the Supabase SQL editor.

-- 1. Owner column (one page per account). Existing rows keep owner_id = null.
alter table public.creators
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- NULLs are distinct in a unique index, so legacy ownerless rows are unaffected.
create unique index if not exists creators_owner_id_key on public.creators(owner_id);

-- 2. Replace the open public-insert policy with owner-scoped writes.
drop policy if exists "public insert" on public.creators;

create policy "owner insert" on public.creators
  for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "owner update" on public.creators
  for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner delete" on public.creators
  for delete to authenticated
  using (auth.uid() = owner_id);

-- "public read" stays as-is: tip pages remain viewable by anyone.
