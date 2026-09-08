import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import {
  createTemplateFromWorkout,
  deleteTemplate,
  getTemplate,
  listMyTemplates,
} from '@/lib/db/templates';

const keys = {
  list: (userId: string) => ['templates', userId] as const,
  detail: (id: string) => ['templates', 'detail', id] as const,
};

export function useMyTemplates() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.list(userId) : ['templates', 'none'],
    queryFn: () => listMyTemplates(userId!),
    enabled: !!userId,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ['templates', 'detail', 'none'],
    queryFn: () => getTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateTemplateFromWorkout() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: (input: { workoutId: string; name: string }) =>
      createTemplateFromWorkout({ userId: userId!, ...input }),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}
