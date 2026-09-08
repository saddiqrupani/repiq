-- Add explicit FK from workouts.user_id -> profiles.id so PostgREST can embed
-- the author profile when reading feed/post rows. The existing FK targets
-- auth.users, which isn't exposed to PostgREST, so `author:profiles!...` fails
-- to resolve without a direct relationship.
--
-- Safe because profiles.id itself references auth.users(id), so any valid
-- workouts.user_id is guaranteed to have a matching profiles.id.
alter table public.workouts
  add constraint workouts_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
