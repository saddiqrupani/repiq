-- Fix ordering bug in the PR trigger. The prior BEFORE-INSERT trigger inserted
-- into personal_records with workout_set_id = new.id — but the workout_sets
-- row didn't exist yet, so the FK on personal_records.workout_set_id blew up.
--
-- Split into two triggers:
--   * BEFORE INSERT: compute est-1RM, decide if it's a new best, stamp new.is_pr.
--   * AFTER INSERT:  if is_pr, upsert personal_records (row now exists → FK OK).

drop trigger if exists workout_sets_check_pr on public.workout_sets;
drop function if exists public.tg_workout_sets_check_pr();

create or replace function public.tg_workout_sets_mark_pr()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_est numeric(7, 2);
  v_prev_est numeric(7, 2);
begin
  if new.weight_kg is null or new.weight_kg <= 0 or new.reps <= 0 then
    return new;
  end if;

  select user_id into v_user_id from public.workouts where id = new.workout_id;
  if v_user_id is null then return new; end if;

  v_est := round((new.weight_kg * (1 + new.reps::numeric / 30))::numeric, 2);

  select est_1rm_kg into v_prev_est
  from public.personal_records
  where user_id = v_user_id and exercise_id = new.exercise_id;

  if v_prev_est is null or v_est > v_prev_est then
    new.is_pr := true;
  end if;

  return new;
end;
$$;

create trigger workout_sets_mark_pr
  before insert on public.workout_sets
  for each row execute function public.tg_workout_sets_mark_pr();

create or replace function public.tg_workout_sets_write_pr()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_est numeric(7, 2);
begin
  if not new.is_pr then return new; end if;

  select user_id into v_user_id from public.workouts where id = new.workout_id;
  if v_user_id is null then return new; end if;

  v_est := round((new.weight_kg * (1 + new.reps::numeric / 30))::numeric, 2);

  insert into public.personal_records
    (user_id, exercise_id, workout_set_id, weight_kg, reps, est_1rm_kg, achieved_at)
  values
    (v_user_id, new.exercise_id, new.id, new.weight_kg, new.reps, v_est, now())
  on conflict (user_id, exercise_id) do update
    set workout_set_id = excluded.workout_set_id,
        weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        est_1rm_kg = excluded.est_1rm_kg,
        achieved_at = excluded.achieved_at;

  return new;
end;
$$;

create trigger workout_sets_write_pr
  after insert on public.workout_sets
  for each row execute function public.tg_workout_sets_write_pr();
