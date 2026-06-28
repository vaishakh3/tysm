-- TYSM feedback pivot: event links and attendee responses.
-- Also cleans up previous TYSM tipping/testimonial tables when applied
-- to the existing TYSM Supabase project.

create extension if not exists pgcrypto;

drop table if exists public.testimonials cascade;
drop table if exists public.spaces cascade;
drop table if exists public.creators cascade;

drop policy if exists "avatar public read" on storage.objects;
drop policy if exists "avatar owner insert" on storage.objects;
drop policy if exists "avatar owner update" on storage.objects;
drop policy if exists "avatar owner delete" on storage.objects;
drop policy if exists "testimonial media read" on storage.objects;
drop policy if exists "testimonial media insert" on storage.objects;
update storage.buckets set public = false where id in ('avatars', 'testimonials');

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 600),
  event_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_events_owner_id_idx on public.feedback_events(owner_id);
create index if not exists feedback_events_active_slug_idx on public.feedback_events(slug)
  where is_active = true;

alter table public.feedback_events enable row level security;

revoke all on public.feedback_events from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.feedback_events to anon, authenticated;
grant insert, update, delete on public.feedback_events to authenticated;

drop policy if exists "feedback events read" on public.feedback_events;
create policy "feedback events read" on public.feedback_events
  for select
  to anon, authenticated
  using (is_active = true or owner_id = (select auth.uid()));

drop policy if exists "feedback events owner insert" on public.feedback_events;
create policy "feedback events owner insert" on public.feedback_events
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "feedback events owner update" on public.feedback_events;
create policy "feedback events owner update" on public.feedback_events
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "feedback events owner delete" on public.feedback_events;
create policy "feedback events owner delete" on public.feedback_events
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.feedback_events(id) on delete cascade,
  attendee_name text check (attendee_name is null or char_length(attendee_name) <= 80),
  attendee_email text check (attendee_email is null or char_length(attendee_email) <= 160),
  rating int not null check (rating between 1 and 5),
  enjoyed text not null check (char_length(enjoyed) between 1 and 1600),
  improve text not null check (char_length(improve) between 1 and 1600),
  anything_else text check (anything_else is null or char_length(anything_else) <= 1000),
  allow_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists feedback_responses_event_id_created_at_idx
  on public.feedback_responses(event_id, created_at desc);

alter table public.feedback_responses enable row level security;

revoke all on public.feedback_responses from public, anon, authenticated;
grant insert on public.feedback_responses to anon, authenticated;
grant select, delete on public.feedback_responses to authenticated;

drop policy if exists "feedback responses public insert" on public.feedback_responses;
create policy "feedback responses public insert" on public.feedback_responses
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.feedback_events e
      where e.id = feedback_responses.event_id
        and e.is_active = true
    )
  );

drop policy if exists "feedback responses owner read" on public.feedback_responses;
create policy "feedback responses owner read" on public.feedback_responses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feedback_events e
      where e.id = feedback_responses.event_id
        and e.owner_id = (select auth.uid())
    )
  );

drop policy if exists "feedback responses owner delete" on public.feedback_responses;
create policy "feedback responses owner delete" on public.feedback_responses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.feedback_events e
      where e.id = feedback_responses.event_id
        and e.owner_id = (select auth.uid())
    )
  );
