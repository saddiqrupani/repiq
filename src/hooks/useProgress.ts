import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import {
  getPersonalRecord,
  listExerciseProgress,
  listExercisesWithHistory,
} from '@/lib/db/progress';

export function useExerciseProgress(exerciseId: string | undefined, days: number) {
  const { session } = useSession();
  const userId = session?.user.id;
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return useQuery({
    queryKey: ['progress', userId, exerciseId, days] as const,
    queryFn: () =>
      listExerciseProgress({ userId: userId!, exerciseId: exerciseId!, sinceIso }),
    enabled: !!userId && !!exerciseId,
  });
}

export function usePersonalRecord(exerciseId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['pr', userId, exerciseId] as const,
    queryFn: () => getPersonalRecord({ userId: userId!, exerciseId: exerciseId! }),
    enabled: !!userId && !!exerciseId,
  });
}

export function useExercisesWithHistory() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['progress-catalog', userId] as const,
    queryFn: () => listExercisesWithHistory(userId!),
    enabled: !!userId,
  });
}
