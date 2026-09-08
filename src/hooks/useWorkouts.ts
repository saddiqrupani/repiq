import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { listExercises } from '@/lib/db/exercises';
import {
  addSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  getWorkoutWithSets,
  listRecentWorkouts,
  listSets,
  startWorkout,
} from '@/lib/db/workouts';

const keys = {
  exercises: ['exercises'] as const,
  activeWorkout: (userId: string) => ['workouts', 'active', userId] as const,
  sets: (workoutId: string) => ['workouts', workoutId, 'sets'] as const,
  recentWorkouts: (userId: string) => ['workouts', 'recent', userId] as const,
  workoutDetail: (workoutId: string) => ['workouts', 'detail', workoutId] as const,
};

export function useExercises() {
  return useQuery({
    queryKey: keys.exercises,
    queryFn: listExercises,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveWorkout() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.activeWorkout(userId) : ['workouts', 'active', 'none'],
    queryFn: () => getActiveWorkout(userId!),
    enabled: !!userId,
  });
}

export function useStartWorkout() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: () => startWorkout(userId!),
    onSuccess: (workout) => {
      if (userId) qc.setQueryData(keys.activeWorkout(userId), workout);
    },
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: (input: {
      workoutId: string;
      title?: string | null;
      shareToGymId?: string | null;
    }) =>
      finishWorkout(input.workoutId, {
        title: input.title,
        shareToGymId: input.shareToGymId,
      }),
    onSuccess: () => {
      if (!userId) return;
      qc.setQueryData(keys.activeWorkout(userId), null);
      qc.invalidateQueries({ queryKey: keys.recentWorkouts(userId) });
      qc.invalidateQueries({ queryKey: ['user', userId, 'recent-shared'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useCancelWorkout() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: (workoutId: string) => deleteWorkout(workoutId),
    onSuccess: () => {
      if (userId) qc.setQueryData(keys.activeWorkout(userId), null);
    },
  });
}

export function useSetsForWorkout(workoutId: string | undefined) {
  return useQuery({
    queryKey: workoutId ? keys.sets(workoutId) : ['workouts', 'none', 'sets'],
    queryFn: () => listSets(workoutId!),
    enabled: !!workoutId,
  });
}

export function useAddSet(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      exerciseId: string;
      position: number;
      weightKg: number | null;
      reps: number;
      rpe: number | null;
    }) => addSet({ workoutId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sets(workoutId) });
    },
  });
}

export function useDeleteSet(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => deleteSet(setId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sets(workoutId) });
    },
  });
}

export function useRecentWorkouts() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.recentWorkouts(userId) : ['workouts', 'recent', 'none'],
    queryFn: () => listRecentWorkouts(userId!),
    enabled: !!userId,
  });
}

export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery({
    queryKey: workoutId ? keys.workoutDetail(workoutId) : ['workouts', 'detail', 'none'],
    queryFn: () => getWorkoutWithSets(workoutId!),
    enabled: !!workoutId,
  });
}
