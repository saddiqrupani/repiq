-- RepIQ social layer: gyms, memberships, follows, shared workouts,
-- reactions, comments, and gym-scoped challenges.
--
-- Design notes:
--   * A "post" is a workout with visibility != 'private'. When shared to a gym
--     we snapshot the target gym on shared_gym_id so retroactive gym-membership
--     changes don't leak old posts.
--   * All authored writes gate on the caller's uid; reads gate on membership
--     or ownership via can_view_workout().
--   * Challenges are simple gym-scoped competitions. MVP metric is workout_count
--     within [starts_at, ends_at); more metrics can slot in behind the check.

create extension if not exists pg_trgm;

-- Gyms -----------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- (name, city) unique so duplicates don't proliferate in the picker.
create unique index gyms_name_city_key on public.gyms (lower(name), lower(coalesce(city, '')));
create index gyms_name_trgm on public.gyms using gin (name gin_trgm_ops);

alter table public.gyms enable row level security;
revoke all on public.gyms from anon, authenticated;
grant select, insert, update on public.gyms to authenticated;

create policy "read all gyms"
  on public.gyms for select to authenticated using (true);
create policy "create gym"
  on public.gyms for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "update own gym"
  on public.gyms for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- Gym membership -------------------------------------------------------------
create table public.gym_members (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);
create index gym_members_user_idx on public.gym_members (user_id);

alter table public.gym_members enable row level security;
revoke all on public.gym_members from anon, authenticated;
grant select, insert, delete on public.gym_members to authenticated;

create policy "read all memberships"
  on public.gym_members for select to authenticated using (true);
create policy "join gym"
  on public.gym_members for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "leave gym"
  on public.gym_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Extend profiles with home_gym_id (soft ref; user may not have joined yet).
alter table public.profiles
  add column home_gym_id uuid references public.gyms(id) on delete set null;

-- Follows --------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id != followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;

create policy "read all follows"
  on public.follows for select to authenticated using (true);
create policy "follow"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy "unfollow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- Extend workouts with visibility + optional gym snapshot + title -----------
alter table public.workouts
  add column visibility text not null default 'private'
    check (visibility in ('private', 'gym')),
  add column shared_gym_id uuid references public.gyms(id) on delete set null,
  add column title text;

create index workouts_shared_gym_idx
  on public.workouts (shared_gym_id, ended_at desc)
  where visibility = 'gym';

-- Replace the old owner-only read policy with one that also lets gym-mates
-- read workouts shared to a gym they belong to.
drop policy if exists "read own workouts" on public.workouts;
create policy "read own or gym-shared workouts"
  on public.workouts for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      visibility = 'gym'
      and shared_gym_id is not null
      and exists (
        select 1 from public.gym_members m
        where m.gym_id = workouts.shared_gym_id
          and m.user_id = (select auth.uid())
      )
    )
  );

-- Helper: can the calling user view this workout?
create or replace function public.can_view_workout(w_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.workouts w
    where w.id = w_id
      and (
        w.user_id = auth.uid()
        or (
          w.visibility = 'gym'
          and w.shared_gym_id is not null
          and exists (
            select 1 from public.gym_members m
            where m.gym_id = w.shared_gym_id
              and m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- Reactions ------------------------------------------------------------------
create table public.post_reactions (
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'fire' check (kind in ('fire')),
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id, kind)
);
create index post_reactions_workout_idx on public.post_reactions (workout_id);

alter table public.post_reactions enable row level security;
revoke all on public.post_reactions from anon, authenticated;
grant select, insert, delete on public.post_reactions to authenticated;

create policy "read reactions on visible posts"
  on public.post_reactions for select to authenticated
  using (public.can_view_workout(workout_id));
create policy "react to visible posts"
  on public.post_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_workout(workout_id)
  );
create policy "unreact"
  on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Comments -------------------------------------------------------------------
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_workout_idx on public.post_comments (workout_id, created_at);

alter table public.post_comments enable row level security;
revoke all on public.post_comments from anon, authenticated;
grant select, insert, delete on public.post_comments to authenticated;

create policy "read comments on visible posts"
  on public.post_comments for select to authenticated
  using (public.can_view_workout(workout_id));
create policy "comment on visible posts"
  on public.post_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_workout(workout_id)
  );
create policy "delete own comment"
  on public.post_comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Challenges -----------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  metric text not null default 'workout_count'
    check (metric in ('workout_count')),
  goal_value numeric not null check (goal_value > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index challenges_gym_idx on public.challenges (gym_id, ends_at desc);

alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;
grant select, insert, update, delete on public.challenges to authenticated;

create policy "read visible challenges"
  on public.challenges for select to authenticated
  using (
    gym_id is null
    or exists (
      select 1 from public.gym_members m
      where m.gym_id = challenges.gym_id
        and m.user_id = (select auth.uid())
    )
  );
create policy "create challenge"
  on public.challenges for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      gym_id is null
      or exists (
        select 1 from public.gym_members m
        where m.gym_id = challenges.gym_id
          and m.user_id = (select auth.uid())
      )
    )
  );
create policy "update own challenge"
  on public.challenges for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy "delete own challenge"
  on public.challenges for delete to authenticated
  using (created_by = (select auth.uid()));

-- Challenge participants -----------------------------------------------------
create table public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_participants_challenge_idx
  on public.challenge_participants (challenge_id);
create index challenge_participants_user_idx
  on public.challenge_participants (user_id);

alter table public.challenge_participants enable row level security;
revoke all on public.challenge_participants from anon, authenticated;
grant select, insert, delete on public.challenge_participants to authenticated;

create policy "read participants of visible challenges"
  on public.challenge_participants for select to authenticated
  using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_participants.challenge_id
        and (
          c.gym_id is null
          or exists (
            select 1 from public.gym_members m
            where m.gym_id = c.gym_id
              and m.user_id = (select auth.uid())
          )
        )
    )
  );
create policy "join challenge"
  on public.challenge_participants for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_participants.challenge_id
        and (
          c.gym_id is null
          or exists (
            select 1 from public.gym_members m
            where m.gym_id = c.gym_id
              and m.user_id = (select auth.uid())
          )
        )
    )
  );
create policy "leave challenge"
  on public.challenge_participants for delete to authenticated
  using (user_id = (select auth.uid()));

-- Seed a small starter set of gyms so onboarding isn't a blank slate.
insert into public.gyms (name, city) values
  ('Gold''s Gym',       'Venice, CA'),
  ('Equinox',           'New York, NY'),
  ('Planet Fitness',    'Austin, TX'),
  ('Anytime Fitness',   'Seattle, WA'),
  ('24 Hour Fitness',   'San Francisco, CA'),
  ('LA Fitness',        'Chicago, IL'),
  ('Crunch Fitness',    'Miami, FL'),
  ('Life Time',         'Minneapolis, MN'),
  ('Home Gym',          null),
  ('Garage Gym',        null);
