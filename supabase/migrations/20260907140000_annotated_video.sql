-- Path (inside lift-videos bucket) of the pose-overlaid replay video.
-- Written by /form/analyze after the annotated .mp4 is uploaded.
alter table public.form_analyses
  add column annotated_video_path text;
