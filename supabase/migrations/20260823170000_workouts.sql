-- RepIQ workouts schema
-- Exercise catalog + workout sessions + individual sets.
-- Weight is stored in kilograms; the client converts for display.

-- Catalog of exercises. Official rows (created_by is null) are readable by everyone;
-- users can also create their own private exercises.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('compound', 'isolation', 'accessory', 'cardio')),
  primary_muscle text not null,
  equipment text not null check (equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other')),
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index exercises_official_name_key
  on public.exercises (lower(name)) where created_by is null;
create unique index exercises_user_name_key
  on public.exercises (created_by, lower(name)) where created_by is not null;
create index exercises_created_by_idx on public.exercises (created_by);

alter table public.exercises enable row level security;
revoke all on public.exercises from anon, authenticated;
grant select, insert, update, delete on public.exercises to authenticated;

create policy "read exercises: official + own"
  on public.exercises for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));

create policy "insert own custom exercise"
  on public.exercises for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "update own custom exercise"
  on public.exercises for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "delete own custom exercise"
  on public.exercises for delete to authenticated
  using (created_by = (select auth.uid()));

-- A workout session. ended_at is null while active.
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
-- One active workout per user at a time.
create unique index workouts_user_active_key
  on public.workouts (user_id) where ended_at is null;

alter table public.workouts enable row level security;
revoke all on public.workouts from anon, authenticated;
grant select, insert, update, delete on public.workouts to authenticated;

create policy "read own workouts"
  on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own workouts"
  on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own workouts"
  on public.workouts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own workouts"
  on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Individual sets. `position` orders sets within a workout for stable display.
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null,
  weight_kg numeric(6, 2),
  reps int not null check (reps >= 0),
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index workout_sets_workout_idx on public.workout_sets (workout_id, position);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id, completed_at desc);

alter table public.workout_sets enable row level security;
revoke all on public.workout_sets from anon, authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;

-- Ownership on sets is derived through the parent workout.
create policy "read sets of own workouts"
  on public.workout_sets for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy "insert sets into own workouts"
  on public.workout_sets for insert to authenticated
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy "update sets of own workouts"
  on public.workout_sets for update to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy "delete sets of own workouts"
  on public.workout_sets for delete to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

-- Seed exercise catalog. Covers the movements a typical lifter logs.
insert into public.exercises (name, category, primary_muscle, equipment) values
  -- Barbell compounds
  ('Back Squat',              'compound',  'quads',       'barbell'),
  ('Front Squat',             'compound',  'quads',       'barbell'),
  ('Deadlift',                'compound',  'back',        'barbell'),
  ('Romanian Deadlift',       'compound',  'hamstrings',  'barbell'),
  ('Bench Press',             'compound',  'chest',       'barbell'),
  ('Incline Bench Press',     'compound',  'chest',       'barbell'),
  ('Overhead Press',          'compound',  'shoulders',   'barbell'),
  ('Barbell Row',             'compound',  'back',        'barbell'),
  ('Hip Thrust',              'compound',  'glutes',      'barbell'),
  -- Dumbbell
  ('Dumbbell Bench Press',    'compound',  'chest',       'dumbbell'),
  ('Dumbbell Incline Press',  'compound',  'chest',       'dumbbell'),
  ('Dumbbell Shoulder Press', 'compound',  'shoulders',   'dumbbell'),
  ('Dumbbell Row',            'compound',  'back',        'dumbbell'),
  ('Dumbbell Lateral Raise',  'isolation', 'shoulders',   'dumbbell'),
  ('Dumbbell Curl',           'isolation', 'biceps',      'dumbbell'),
  ('Hammer Curl',             'isolation', 'biceps',      'dumbbell'),
  ('Bulgarian Split Squat',   'compound',  'quads',       'dumbbell'),
  -- Machine / cable
  ('Lat Pulldown',            'compound',  'back',        'cable'),
  ('Seated Cable Row',        'compound',  'back',        'cable'),
  ('Cable Tricep Pushdown',   'isolation', 'triceps',     'cable'),
  ('Cable Fly',               'isolation', 'chest',       'cable'),
  ('Face Pull',               'isolation', 'shoulders',   'cable'),
  ('Leg Press',               'compound',  'quads',       'machine'),
  ('Leg Extension',           'isolation', 'quads',       'machine'),
  ('Leg Curl',                'isolation', 'hamstrings',  'machine'),
  ('Calf Raise',              'isolation', 'calves',      'machine'),
  -- Bodyweight
  ('Pull-Up',                 'compound',  'back',        'bodyweight'),
  ('Chin-Up',                 'compound',  'back',        'bodyweight'),
  ('Dip',                     'compound',  'chest',       'bodyweight'),
  ('Push-Up',                 'compound',  'chest',       'bodyweight'),
  ('Plank',                   'isolation', 'core',        'bodyweight');
