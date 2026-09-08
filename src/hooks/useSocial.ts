import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import {
  createChallenge,
  getChallenge,
  getChallengeLeaderboard,
  joinChallenge,
  leaveChallenge,
  listChallengesForGym,
} from '@/lib/db/challenges';
import { countFollowers, countFollowing, follow, isFollowing, unfollow } from '@/lib/db/follows';
import {
  createGym,
  getGym,
  joinGym,
  leaveGym,
  listGymMembers,
  listMyGyms,
  searchGyms,
} from '@/lib/db/gyms';
import { ensureProfile, getProfile, getProfileByUsername, setHomeGym } from '@/lib/db/profiles';
import {
  addComment,
  deleteComment,
  fetchFeed,
  fetchPost,
  listComments,
  listUserRecentSharedWorkouts,
  shareWorkout,
  toggleReaction,
} from '@/lib/db/social';
import type { Challenge } from '@/lib/db/types';

// -- Profile / gyms --------------------------------------------------------

export function useMyProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  const email = session?.user.email;
  return useQuery({
    queryKey: userId ? ['profile', userId] : ['profile', 'none'],
    // ensureProfile self-heals when the profile row is missing (e.g. after a
    // local `supabase db reset` wiped public schema but kept auth.users).
    queryFn: () => ensureProfile({ userId: userId!, email }),
    enabled: !!userId,
  });
}

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'byUsername', username],
    queryFn: () => getProfileByUsername(username!),
    enabled: !!username,
  });
}

export function useProfileById(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'byId', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}

export function useGymSearch(query: string) {
  return useQuery({
    queryKey: ['gyms', 'search', query],
    queryFn: () => searchGyms(query),
    staleTime: 30 * 1000,
  });
}

export function useGym(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', 'byId', gymId],
    queryFn: () => getGym(gymId!),
    enabled: !!gymId,
  });
}

export function useGymMembers(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', gymId, 'members'],
    queryFn: () => listGymMembers(gymId!),
    enabled: !!gymId,
  });
}

export function useMyGyms() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: uid ? ['gyms', 'mine', uid] : ['gyms', 'mine', 'none'],
    queryFn: () => listMyGyms(uid!),
    enabled: !!uid,
  });
}

export function useJoinGym() {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (gymId: string) => joinGym(gymId, uid!),
    onSuccess: (_data, gymId) => {
      qc.invalidateQueries({ queryKey: ['gyms', gymId, 'members'] });
      if (uid) qc.invalidateQueries({ queryKey: ['gyms', 'mine', uid] });
    },
  });
}

export function useLeaveGym() {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (gymId: string) => leaveGym(gymId, uid!),
    onSuccess: (_data, gymId) => {
      qc.invalidateQueries({ queryKey: ['gyms', gymId, 'members'] });
      if (uid) qc.invalidateQueries({ queryKey: ['gyms', 'mine', uid] });
    },
  });
}

export function useCreateGym() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (input: { name: string; city: string | null }) =>
      createGym({ ...input, createdBy: uid! }),
  });
}

export function useSetHomeGym() {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (gymId: string | null) => setHomeGym(uid!, gymId),
    onSuccess: () => {
      if (uid) qc.invalidateQueries({ queryKey: ['profile', uid] });
    },
  });
}

// -- Follows ----------------------------------------------------------------

export function useFollowState(otherUserId: string | undefined) {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['follows', uid, otherUserId],
    queryFn: () => isFollowing(uid!, otherUserId!),
    enabled: !!uid && !!otherUserId && uid !== otherUserId,
  });
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['follows', 'counts', userId],
    queryFn: async () => ({
      followers: await countFollowers(userId!),
      following: await countFollowing(userId!),
    }),
    enabled: !!userId,
  });
}

export function useToggleFollow(otherUserId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: async (nextFollowing: boolean) => {
      if (!uid) return;
      if (nextFollowing) await follow(uid, otherUserId);
      else await unfollow(uid, otherUserId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', uid, otherUserId] });
      qc.invalidateQueries({ queryKey: ['follows', 'counts', otherUserId] });
    },
  });
}

// -- Feed / posts -----------------------------------------------------------

export function useFeed() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: uid ? ['feed', uid] : ['feed', 'none'],
    queryFn: () => fetchFeed(uid!),
    enabled: !!uid,
  });
}

export function usePost(workoutId: string | undefined) {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['post', workoutId, uid],
    queryFn: () => fetchPost(workoutId!, uid!),
    enabled: !!workoutId && !!uid,
  });
}

export function useToggleReaction(workoutId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (nextOn: boolean) => toggleReaction(workoutId, uid!, nextOn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post', workoutId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useComments(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['post', workoutId, 'comments'],
    queryFn: () => listComments(workoutId!),
    enabled: !!workoutId,
  });
}

export function useAddComment(workoutId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (body: string) => addComment({ workoutId, userId: uid!, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post', workoutId, 'comments'] });
      qc.invalidateQueries({ queryKey: ['post', workoutId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteComment(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post', workoutId, 'comments'] });
      qc.invalidateQueries({ queryKey: ['post', workoutId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useShareWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workoutId: string; gymId: string; title: string | null }) =>
      shareWorkout(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useUserRecentShared(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId, 'recent-shared'],
    queryFn: () => listUserRecentSharedWorkouts(userId!),
    enabled: !!userId,
  });
}

// -- Challenges -------------------------------------------------------------

export function useGymChallenges(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', gymId, 'challenges'],
    queryFn: () => listChallengesForGym(gymId!),
    enabled: !!gymId,
  });
}

export function useChallenge(id: string | undefined) {
  return useQuery({
    queryKey: ['challenges', id],
    queryFn: () => getChallenge(id!),
    enabled: !!id,
  });
}

export function useChallengeLeaderboard(challenge: Challenge | null | undefined) {
  return useQuery({
    queryKey: ['challenges', challenge?.id, 'leaderboard'],
    queryFn: () => getChallengeLeaderboard(challenge!),
    enabled: !!challenge,
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: (input: {
      gymId: string | null;
      name: string;
      description: string | null;
      goalValue: number;
      endsAt: string;
    }) => createChallenge({ ...input, createdBy: uid! }),
    onSuccess: (challenge) => {
      if (challenge.gym_id)
        qc.invalidateQueries({ queryKey: ['gyms', challenge.gym_id, 'challenges'] });
    },
  });
}

export function useJoinChallenge(challengeId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: () => joinChallenge(challengeId, uid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges', challengeId] });
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

export function useLeaveChallenge(challengeId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: () => leaveChallenge(challengeId, uid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges', challengeId] });
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}
