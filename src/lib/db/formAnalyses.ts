import { File, UploadType } from 'expo-file-system';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import type { Exercise, FormAnalysis } from './types';

export const LIFT_VIDEOS_BUCKET = 'lift-videos';

export type FormAnalysisWithExercise = FormAnalysis & {
  exercise: Pick<Exercise, 'id' | 'name' | 'equipment'>;
};

export async function listMyFormAnalyses(userId: string, limit = 20): Promise<FormAnalysisWithExercise[]> {
  const { data, error } = await supabase
    .from('form_analyses')
    .select('*, exercise:exercises!inner (id, name, equipment)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as never;
}

export async function getFormAnalysis(id: string): Promise<FormAnalysisWithExercise | null> {
  const { data, error } = await supabase
    .from('form_analyses')
    .select('*, exercise:exercises!inner (id, name, equipment)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as FormAnalysisWithExercise | null;
}

// Uploads the local video file at `localUri` to `lift-videos/{userId}/{ts}.mp4`
// and returns the object path (without the bucket prefix).
//
// Streams the file bytes to Supabase Storage's REST endpoint via expo-file-system.
// The supabase-js SDK path (fetch → Blob → upload) reads the whole file into a JS
// string on RN, which blows past the string length limit for video-sized payloads.
export async function uploadLiftVideo(input: {
  userId: string;
  localUri: string;
}): Promise<string> {
  const ts = Date.now();
  const objectPath = `${input.userId}/${ts}.mp4`;

  const file = new File(input.localUri);
  if (!file.size) throw new Error('Video read failed (0 bytes). Try picking again.');
  const MAX_BYTES = 200 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(0);
    throw new Error(`Video is ${mb} MB — max 200 MB. Trim it or record a shorter clip.`);
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not signed in');

  const uploadUrl = `${env.supabaseUrl}/storage/v1/object/${LIFT_VIDEOS_BUCKET}/${objectPath}`;
  const result = await file.upload(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: 'video/mp4',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': 'video/mp4',
      'x-upsert': 'false',
    },
  });
  if (result.status >= 300) {
    throw new Error(`Upload failed (${result.status}): ${result.body}`);
  }
  return objectPath;
}

export async function signedThumbUrl(objectPath: string, expiresIn = 300): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(LIFT_VIDEOS_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function signedVideoUrl(objectPath: string, expiresIn = 900): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(LIFT_VIDEOS_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
