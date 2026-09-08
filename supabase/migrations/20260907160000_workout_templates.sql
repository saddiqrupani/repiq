-- Workout templates: a named list of exercises the user re-uses across sessions.
-- Sets are not fully specified (weight/reps vary each week) — the template just
-- captures ordering so starting a workout from a template pre-picks the right
-- exercises. Users can annotate a target-rep hint per exercise.

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_templates_user_idx on public.workout_templates (user_id, created_at desc);

alter table public.workout_templates enable row level security;
revoke all on public.workout_templates from anon, authenticated;
grant select, insert, update, delete on public.workout_templates to authenticated;

create policy "read own templates"
  on public.workout_templates for select to authenticated
  using (user_id = (select auth.uid()));
create policy "insert own templates"
  on public.workout_templates for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own templates"
  on public.workout_templates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "delete own templates"
  on public.workout_templates for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null,
  target_sets int,
  target_reps int
);

create index wt_exercises_template_idx on public.workout_template_exercises (template_id, position);

alter table public.workout_template_exercises enable row level security;
revoke all on public.workout_template_exercises from anon, authenticated;
grant select, insert, update, delete on public.workout_template_exercises to authenticated;

-- Ownership derived through the parent template.
create policy "read template exercises of own templates"
  on public.workout_template_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_templates t
    where t.id = workout_template_exercises.template_id and t.user_id = (select auth.uid())
  ));
create policy "insert template exercises into own templates"
  on public.workout_template_exercises for insert to authenticated
  with check (exists (
    select 1 from public.workout_templates t
    where t.id = workout_template_exercises.template_id and t.user_id = (select auth.uid())
  ));
create policy "update template exercises of own templates"
  on public.workout_template_exercises for update to authenticated
  using (exists (
    select 1 from public.workout_templates t
    where t.id = workout_template_exercises.template_id and t.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_templates t
    where t.id = workout_template_exercises.template_id and t.user_id = (select auth.uid())
  ));
create policy "delete template exercises of own templates"
  on public.workout_template_exercises for delete to authenticated
  using (exists (
    select 1 from public.workout_templates t
    where t.id = workout_template_exercises.template_id and t.user_id = (select auth.uid())
  ));
