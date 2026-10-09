-- DevsAssemble — 0020 member event authoring (auto-publish)
-- Organizers (any signed-in member) can create and manage their OWN events,
-- which publish immediately. Admins keep full control (events_write_admin).
-- A guard trigger prevents non-admins from setting the broadcast fields
-- (is_live / stream_embed_url) — stream_embed_url renders in an <iframe>, so
-- member control of it would be an injection/clickjacking vector.

-- Owners can see their own rows (covers any non-published state).
create policy "events_select_own"
  on public.events for select
  to authenticated
  using (created_by = auth.uid());

-- Owners can create events attributed to themselves.
create policy "events_insert_own"
  on public.events for insert
  to authenticated
  with check (created_by = auth.uid());

-- Owners can update / delete only their own events.
create policy "events_update_own"
  on public.events for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "events_delete_own"
  on public.events for delete
  to authenticated
  using (created_by = auth.uid());

-- Broadcast fields stay admin-only, enforced at the row level: non-admins can
-- never set them on insert, and never change them on update.
create or replace function public.guard_event_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if (tg_op = 'UPDATE') then
      new.is_live := old.is_live;
      new.stream_embed_url := old.stream_embed_url;
    else
      new.is_live := false;
      new.stream_embed_url := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger events_guard_privileges
  before insert or update on public.events
  for each row execute function public.guard_event_privileges();
