import { supabase } from '@/lib/supabase';

import type { FeedPost, PostComment } from './types';

// Feed: shared workouts from gyms the caller belongs to.
// RLS on `workouts` already filters to visible rows, so we can safely fetch all
// visibility='gym' finished workouts and let the DB scope them.
export async function fetchFeed(currentUserId: string, limit = 30): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      *,
      author:profiles!workouts_user_id_profiles_fkey (id, username, display_name, avatar_url),
      gym:gyms!workouts_shared_gym_id_fkey (id, name, city),
      sets:workout_sets (
        *,
        exercise:exercises (id, name, equipment)
      ),
      reaction_rows:post_reactions (user_id, kind),
      comment_rows:post_comments (id)
    `,
    )
    .eq('visibility', 'gym')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .order('position', { referencedTable: 'workout_sets', ascending: true })
    .limit(limit);
  if (error) throw error;

  type Row = FeedPost & {
    reaction_rows: { user_id: string; kind: string }[];
    comment_rows: { id: string }[];
  };
  return (data as unknown as Row[]).map((r) => {
    const { reaction_rows, comment_rows, ...rest } = r;
    return {
      ...rest,
      reactions: {
        count: reaction_rows.length,
        mine: reaction_rows.some((x) => x.user_id === currentUserId),
      },
      comments: { count: comment_rows.length },
    } as FeedPost;
  });
}

export async function fetchPost(
  workoutId: string,
  currentUserId: string,
): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      *,
      author:profiles!workouts_user_id_profiles_fkey (id, username, display_name, avatar_url),
      gym:gyms!workouts_shared_gym_id_fkey (id, name, city),
      sets:workout_sets (
        *,
        exercise:exercises (id, name, equipment)
      ),
      reaction_rows:post_reactions (user_id, kind),
      comment_rows:post_comments (id)
    `,
    )
    .eq('id', workoutId)
    .order('position', { referencedTable: 'workout_sets', ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type Row = FeedPost & {
    reaction_rows: { user_id: string; kind: string }[];
    comment_rows: { id: string }[];
  };
  const r = data as unknown as Row;
  const { reaction_rows, comment_rows, ...rest } = r;
  return {
    ...rest,
    reactions: {
      count: reaction_rows.length,
      mine: reaction_rows.some((x) => x.user_id === currentUserId),
    },
    comments: { count: comment_rows.length },
  } as FeedPost;
}

export async function toggleReaction(
  workoutId: string,
  userId: string,
  desired: boolean,
): Promise<void> {
  if (desired) {
    const { error } = await supabase
      .from('post_reactions')
      .upsert(
        { workout_id: workoutId, user_id: userId, kind: 'fire' },
        { onConflict: 'workout_id,user_id,kind', ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .eq('kind', 'fire');
    if (error) throw error;
  }
}

export async function listComments(
  workoutId: string,
): Promise<
  Array<PostComment & { author: { id: string; username: string; display_name: string | null } }>
> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, author:profiles!inner (id, username, display_name)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as never;
}

export async function addComment(input: {
  workoutId: string;
  userId: string;
  body: string;
}): Promise<PostComment> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      workout_id: input.workoutId,
      user_id: input.userId,
      body: input.body.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as PostComment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function shareWorkout(input: {
  workoutId: string;
  gymId: string;
  title: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({
      visibility: 'gym',
      shared_gym_id: input.gymId,
      title: input.title,
    })
    .eq('id', input.workoutId);
  if (error) throw error;
}

export async function listUserRecentSharedWorkouts(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      *,
      gym:gyms!workouts_shared_gym_id_fkey (id, name)
    `,
    )
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
