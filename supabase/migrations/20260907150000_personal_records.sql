-- Personal records per user × exercise, keyed by estimated 1-rep max (Epley).
-- Populated by a trigger on workout_sets insert. Also stamps the source set's
-- `is_pr` so the feed can render a badge without a second lookup.

create table public.personal_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  workout_set_id uuid not null references public.workout_sets(id) on delete cascade,
  weight_kg numeric(6, 2) not null,
  reps int not null,
  est_1rm_kg numeric(7, 2) not null,
  achieved_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index personal_records_exercise_idx on public.personal_records (exercise_id);

alter table public.personal_records enable row level security;
revoke all on public.personal_records from anon, authenticated;
grant select on public.personal_records to authenticated;

create policy "read own PRs"
  on public.personal_records for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.workout_sets add column is_pr boolean not null default false;

-- Trigger: on insert of a weighted set with positive reps, decide if this set
-- beats the user's existing PR for the exercise. If so, upsert personal_records
-- and stamp the new set. Runs as security definer so the row's user's PR is
-- authoritative regardless of who's inserting (only the owner can insert anyway
-- per workout_sets RLS, but this keeps the trigger simple).
create or replace function public.tg_workout_sets_check_pr()
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
  if v_user_id is null then
    return new;
  end if;

  -- Epley: 1RM ≈ w × (1 + reps / 30)
  v_est := round((new.weight_kg * (1 + new.reps::numeric / 30))::numeric, 2);

  select est_1rm_kg into v_prev_est
  from public.personal_records
  where user_id = v_user_id and exercise_id = new.exercise_id;

  if v_prev_est is null or v_est > v_prev_est then
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
    new.is_pr := true;
  end if;

  return new;
end;
$$;

create trigger workout_sets_check_pr
  before insert on public.workout_sets
  for each row execute function public.tg_workout_sets_check_pr();
