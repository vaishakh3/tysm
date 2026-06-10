-- ============================================================
-- TYSM — testimonial / "thank-you" collection (B2B wedge)
-- Spaces (a business's collection page) + testimonials.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- spaces ----------
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 80),
  headline text check (char_length(headline) <= 140),
  intro text check (char_length(intro) <= 400),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  created_at timestamptz not null default now()
);

create index if not exists spaces_owner_id_idx on public.spaces(owner_id);

alter table public.spaces enable row level security;

drop policy if exists "spaces public read" on public.spaces;
create policy "spaces public read" on public.spaces
  for select using (true);

drop policy if exists "spaces owner insert" on public.spaces;
create policy "spaces owner insert" on public.spaces
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "spaces owner update" on public.spaces;
create policy "spaces owner update" on public.spaces
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "spaces owner delete" on public.spaces;
create policy "spaces owner delete" on public.spaces
  for delete to authenticated using (auth.uid() = owner_id);

-- ---------- testimonials ----------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  author_role text check (char_length(author_role) <= 100),
  rating int not null default 5 check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_space_id_idx on public.testimonials(space_id);

alter table public.testimonials enable row level security;

-- Public can read only approved testimonials; owners can read all of their own.
drop policy if exists "testimonials read" on public.testimonials;
create policy "testimonials read" on public.testimonials
  for select using (
    approved = true
    or exists (
      select 1 from public.spaces s
      where s.id = testimonials.space_id and s.owner_id = auth.uid()
    )
  );

-- Anyone (even anonymous) can submit, but only as pending (approved = false).
drop policy if exists "testimonials public insert" on public.testimonials;
create policy "testimonials public insert" on public.testimonials
  for insert with check (approved = false);

-- Only the space owner can approve / edit testimonials.
drop policy if exists "testimonials owner update" on public.testimonials;
create policy "testimonials owner update" on public.testimonials
  for update to authenticated using (
    exists (
      select 1 from public.spaces s
      where s.id = testimonials.space_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.spaces s
      where s.id = testimonials.space_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "testimonials owner delete" on public.testimonials;
create policy "testimonials owner delete" on public.testimonials
  for delete to authenticated using (
    exists (
      select 1 from public.spaces s
      where s.id = testimonials.space_id and s.owner_id = auth.uid()
    )
  );
