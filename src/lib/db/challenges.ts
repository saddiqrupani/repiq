import { supabase } from '@/lib/supabase';

import type { Challenge } from './types';

export async function listChallengesForGym(gymId: string): Promise<
  Array<Challenge & { participant_count: number; joined: boolean }>
> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*, participants:challenge_participants (user_id)')
    .eq('gym_id', gymId)
    .order('ends_at', { ascending: true });
  if (error) throw error;
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  return (data as unknown as Array<Challenge & { participants: { user_id: string }[] }>).map((c) => {
    const { participants, ...rest } = c;
    return {
      ...rest,
      participant_count: participants.length,
      joined: !!uid && participants.some((p) => p.user_id === uid),
    };
  });
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Challenge | null;
}

export async function createChallenge(input: {
  gymId: string | null;
  createdBy: string;
  name: string;
  description: string | null;
  goalValue: number;
  endsAt: string;
}): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      gym_id: input.gymId,
      created_by: input.createdBy,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      metric: 'workout_count',
      goal_value: input.goalValue,
      ends_at: input.endsAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Challenge;
}

export async function joinChallenge(challengeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .upsert(
      { challenge_id: challengeId, user_id: userId },
      { onConflict: 'challenge_id,user_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function leaveChallenge(challengeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
  if (error) throw error;
}

// Leaderboard: for each participant of the challenge, count finished workouts in [starts_at, ends_at).
// The workouts read is RLS-scoped, so for gym challenges we need each participant's workouts to
// be readable via the gym-visibility policy. Simpler alternative: run one aggregation query.
// For MVP, do this in two round-trips: fetch participants (with profile), then batch count workouts.
export async function getChallengeLeaderboard(
  challenge: Challenge,
): Promise<
  Array<{
    user_id: string;
    username: string;
    display_name: string | null;
    count: number;
  }>
> {
  const { data: parts, error: partsErr } = await supabase
    .from('challenge_participants')
    .select('user_id, profile:profiles!inner (id, username, display_name)')
    .eq('challenge_id', challenge.id);
  if (partsErr) throw partsErr;

  type Part = {
    user_id: string;
    profile: { username: string; display_name: string | null };
  };
  const results = await Promise.all(
    ((parts ?? []) as unknown as Part[]).map(
      async (p) => {
        // Count finished workouts for this user in the challenge window that we can see.
        const { count, error } = await supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.user_id)
          .not('ended_at', 'is', null)
          .gte('started_at', challenge.starts_at)
          .lt('started_at', challenge.ends_at);
        if (error) throw error;
        return {
          user_id: p.user_id,
          username: p.profile.username,
          display_name: p.profile.display_name,
          count: count ?? 0,
        };
      },
    ),
  );
  return results.sort((a, b) => b.count - a.count);
}
