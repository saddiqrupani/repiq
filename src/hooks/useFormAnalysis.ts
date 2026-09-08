import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import {
  getFormAnalysis,
  listMyFormAnalyses,
  uploadLiftVideo,
} from '@/lib/db/formAnalyses';
import type { FormAnalysis } from '@/lib/db/types';

const keys = {
  list: (userId: string) => ['form-analyses', 'mine', userId] as const,
  detail: (id: string) => ['form-analyses', 'detail', id] as const,
};

export function useMyFormAnalyses() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.list(userId) : ['form-analyses', 'mine', 'none'],
    queryFn: () => listMyFormAnalyses(userId!),
    enabled: !!userId,
  });
}

export function useFormAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ['form-analyses', 'detail', 'none'],
    queryFn: () => getFormAnalysis(id!),
    enabled: !!id,
  });
}

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

export type QuizResponse = {
  analysis_id: string;
  exercise: string;
  questions: QuizQuestion[];
};

// POST /form/{id}/quiz — generates a fresh 3-question quiz off the analysis
// feedback. Not cached: users can regenerate to get different phrasings.
export function useGenerateQuiz() {
  return useMutation({
    mutationFn: (analysisId: string) =>
      api<QuizResponse>(`/form/${analysisId}/quiz`, { method: 'POST' }),
  });
}

// Upload → POST /form/analyze. Returns the created FormAnalysis row.
export function useAnalyzeVideo() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (input: {
      localUri: string;
      exerciseId: string;
      workoutSetId?: string | null;
    }): Promise<FormAnalysis> => {
      if (!userId) throw new Error('Not signed in');
      const videoPath = await uploadLiftVideo({ userId, localUri: input.localUri });
      const result = await api<FormAnalysis>('/form/analyze', {
        method: 'POST',
        body: JSON.stringify({
          video_path: videoPath,
          exercise_id: input.exerciseId,
          workout_set_id: input.workoutSetId ?? null,
        }),
      });
      return result;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}
