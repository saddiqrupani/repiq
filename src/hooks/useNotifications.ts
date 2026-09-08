import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import {
  listMyNotifications,
  markAllNotificationsRead,
  unreadNotificationCount,
} from '@/lib/db/notifications';

const keys = {
  list: (userId: string) => ['notifications', userId] as const,
  unread: (userId: string) => ['notifications', userId, 'unread'] as const,
};

export function useNotifications() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.list(userId) : ['notifications', 'none'],
    queryFn: () => listMyNotifications(userId!),
    enabled: !!userId,
  });
}

export function useUnreadCount() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: userId ? keys.unread(userId) : ['notifications', 'none', 'unread'],
    queryFn: () => unreadNotificationCount(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: keys.list(userId) });
      qc.invalidateQueries({ queryKey: keys.unread(userId) });
    },
  });
}
