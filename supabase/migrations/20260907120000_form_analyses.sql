-- Video-based form analysis.
--
-- Flow: client uploads a short clip to the `lift-videos` bucket under the path
--   {user_id}/{workout_set_id}/{timestamp}.mp4
-- then POSTs the path to /form/analyze on the FastAPI backend. The backend
-- creates a row here (status='processing'), runs MediaPipe pose extraction,
-- scores the reps, and updates the row with score/feedback/metrics.
--
-- We keep the analysis result in Postgres (not just S3) so we can list past
-- form checks on the profile without needing to hit the backend again.

create type form_analysis_status as enum ('processing', 'complete', 'failed');

create table public.form_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_set_id uuid references public.workout_sets(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  video_path text not null,
  status form_analysis_status not null default 'processing',
  score numeric(4,1),
  feedback jsonb,
  metrics jsonb,
  frame_thumb_path text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index form_analyses_user_created_idx
  on public.form_analyses (user_id, created_at desc);
create index form_analyses_set_idx
  on public.form_analyses (workout_set_id);

alter table public.form_analyses enable row level security;
revoke all on public.form_analyses from anon, authenticated;
grant select, insert, update, delete on public.form_analyses to authenticated;

-- Owner read/write. Gym-mates can additionally read analyses attached to a
-- workout the caller can already view (via can_view_workout on the parent).
create policy "read own or gym-visible form analyses"
  on public.form_analyses for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      workout_set_id is not null
      and exists (
        select 1 from public.workout_sets s
        where s.id = form_analyses.workout_set_id
          and public.can_view_workout(s.workout_id)
      )
    )
  );

create policy "insert own form analyses"
  on public.form_analyses for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own form analyses"
  on public.form_analyses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own form analyses"
  on public.form_analyses for delete to authenticated
  using (user_id = (select auth.uid()));

-- Storage bucket for lift videos (private) + thumbnails ---------------------
-- We use a single private bucket and namespace by user_id in the object path
-- so RLS on storage.objects can gate by (storage.foldername(name))[1].
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lift-videos',
  'lift-videos',
  false,
  52428800, -- 50 MB cap; short clips only
  array['video/mp4', 'video/quicktime', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Object policies: user can read/write only objects under their own uid prefix.
create policy "lift-videos read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lift-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "lift-videos insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lift-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "lift-videos update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'lift-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'lift-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "lift-videos delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lift-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
