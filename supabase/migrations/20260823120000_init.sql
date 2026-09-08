-- RepIQ initial schema
-- Establishes the profiles table and the trigger that mirrors auth.users into public.profiles.
-- RLS is enabled on every user-owned table; anon has no direct access.

create extension if not exists "pgcrypto";

-- Profiles: one row per auth user.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  home_gym text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

create policy "read all profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-provision a profile row when a user signs up.
-- Username defaults to the local-part of their email; user can change it later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := split_part(new.email, '@', 1);
  -- Suffix with 4 random chars if the username is already taken.
  if exists (select 1 from public.profiles where username = candidate) then
    candidate := candidate || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at auto-touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
