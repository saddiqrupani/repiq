import { supabase } from '@/lib/supabase';

import type { NotificationWithRefs } from './types';

export async function listMyNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationWithRefs[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey (id, username, display_name, avatar_url),
      exercise:exercises!notifications_personal_record_exercise_id_fkey (id, name)
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as NotificationWithRefs[];
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}
