-- Bump lift-videos bucket cap from 50MB → 200MB.
-- iOS Photos exports (H.264/HEVC .mov) run well over 50MB for even short clips.
update storage.buckets
set file_size_limit = 209715200
where id = 'lift-videos';
