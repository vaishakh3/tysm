-- Optional event header images for attendee feedback forms.

alter table public.feedback_events
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

drop policy if exists "event images public read" on storage.objects;

drop policy if exists "event images owner insert" on storage.objects;
create policy "event images owner insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "event images owner update" on storage.objects;
create policy "event images owner update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "event images owner delete" on storage.objects;
create policy "event images owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
