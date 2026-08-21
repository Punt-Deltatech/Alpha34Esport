-- Auto-provisions a public.profiles row whenever a new Supabase Auth user is created,
-- matching the design documented in Golang-main/internal/models/profile.go.
--
-- Note: this function references public.profiles before that table necessarily exists
-- (it's created by the Go backend's GORM AutoMigrate on first run, not by a Supabase
-- migration) — that's fine, plpgsql function bodies aren't validated against object
-- existence until they actually execute. Just make sure the Go backend has run at least
-- once (which creates the table) before anyone signs up through Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, status, created_at, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'active', now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
