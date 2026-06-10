-- ============================================================
-- TYSM — testimonial media (author photo + video) and
-- owner-side review import.
-- ============================================================

-- ---------- new columns ----------
alter table public.testimonials
  add column if not exists author_avatar_url text,
  add column if not exists video_url text;

-- ---------- public bucket for testimonial media ----------
-- Customers submit without logging in, so this bucket must allow
-- anonymous uploads. (Space logos reuse the owner-scoped "avatars"
-- bucket from migration 0003.)
insert into storage.buckets (id, name, public)
values ('testimonials', 'testimonials', true)
on conflict (id) do update set public = true;

drop policy if exists "testimonial media read" on storage.objects;
create policy "testimonial media read" on storage.objects
  for select using (bucket_id = 'testimonials');

drop policy if exists "testimonial media insert" on storage.objects;
create policy "testimonial media insert" on storage.objects
  for insert with check (bucket_id = 'testimonials');

-- ---------- owner-side import ----------
-- Lets a space owner insert testimonials directly (e.g. imported
-- reviews) which may be pre-approved. The existing public-insert
-- policy still only allows anonymous inserts with approved = false.
drop policy if exists "testimonials owner insert" on public.testimonials;
create policy "testimonials owner insert" on public.testimonials
  for insert to authenticated with check (
    exists (
      select 1 from public.spaces s
      where s.id = testimonials.space_id and s.owner_id = auth.uid()
    )
  );
