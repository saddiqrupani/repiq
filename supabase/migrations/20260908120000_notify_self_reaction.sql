-- Allow self-reactions to notify the author (useful during dev/testing).
-- Comments still skip self so single-user comment threads don't spam.
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
  if v_owner is null then return new; end if;
  insert into public.notifications (user_id, actor_id, kind, workout_id)
    values (v_owner, new.user_id, 'reaction', new.workout_id);
  return new;
end;
$$;
