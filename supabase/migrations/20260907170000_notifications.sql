-- Notifications feed per user. Populated by triggers on reactions, comments,
-- follows, and personal_records. The client marks entries read on view.
--
-- We don't try to fold duplicates ("Alice fire'd your workout" repeated) — RN
-- lists handle a hundred rows fine and it's simpler than dedupe logic.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('reaction', 'comment', 'follow', 'pr')),
  workout_id uuid references public.workouts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  -- Only set for kind='pr'. Uses a real FK so PostgREST can join to exercises.
  personal_record_exercise_id uuid references public.exercises(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;

create policy "read own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Only the "read" transition is legal from the client.
create policy "mark own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Trigger fn: react on someone else's post → notify the owner.
create or replace function public.tg_notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.workouts where id = new.workout_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, kind, workout_id)
    values (v_owner, new.user_id, 'reaction', new.workout_id);
  return new;
end;
$$;

create trigger post_reactions_notify
  after insert on public.post_reactions
  for each row execute function public.tg_notify_reaction();

-- Trigger fn: comment on someone else's post → notify the owner.
create or replace function public.tg_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.workouts where id = new.workout_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, kind, workout_id, comment_id)
    values (v_owner, new.user_id, 'comment', new.workout_id, new.id);
  return new;
end;
$$;

create trigger post_comments_notify
  after insert on public.post_comments
  for each row execute function public.tg_notify_comment();

-- Trigger fn: someone followed you → notify the followee.
create or replace function public.tg_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, kind)
    values (new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.tg_notify_follow();

-- Trigger fn: a new personal record upserted → self-notify the athlete.
create or replace function public.tg_notify_pr()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workout uuid;
begin
  select workout_id into v_workout from public.workout_sets where id = new.workout_set_id;
  insert into public.notifications
    (user_id, actor_id, kind, workout_id, personal_record_exercise_id)
  values
    (new.user_id, new.user_id, 'pr', v_workout, new.exercise_id);
  return new;
end;
$$;

create trigger personal_records_notify
  after insert or update on public.personal_records
  for each row execute function public.tg_notify_pr();
