import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMarkAllRead, useNotifications } from '@/hooks/useNotifications';
import type { NotificationWithRefs } from '@/lib/db/types';

export default function NotificationsScreen() {
  const list = useNotifications();
  const markRead = useMarkAllRead();

  // Mark everything read whenever the tab gains focus — this is the "see the
  // count clear" behavior users expect from every notifications inbox.
  useFocusEffect(
    useCallback(() => {
      markRead.mutate();
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-white">Notifications</Text>
      </View>

      {list.isPending ? (
        <View className="items-center pt-16">
          <ActivityIndicator color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 8 }}
          ListEmptyComponent={
            <View className="mt-8 items-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white">All quiet</Text>
              <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Reactions, comments, follows, and PRs will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => <NotificationRow n={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ n }: { n: NotificationWithRefs }) {
  const actor = n.actor?.display_name || n.actor?.username || 'Someone';
  const unread = !n.read_at;

  function onPress() {
    if (n.workout_id) router.push(`/post/${n.workout_id}`);
  }

  const { icon, body } = describe(n, actor);

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl p-4 ${
        unread
          ? 'bg-brand-500/10'
          : 'bg-zinc-50 dark:bg-zinc-900'
      }`}>
      <Text className="text-lg">{icon}</Text>
      <View className="flex-1">
        <Text className="text-sm text-zinc-900 dark:text-white">{body}</Text>
        <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {timeAgo(n.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

function describe(n: NotificationWithRefs, actor: string): { icon: string; body: string } {
  switch (n.kind) {
    case 'reaction':
      return { icon: '🔥', body: `${actor} fired up your workout.` };
    case 'comment':
      return { icon: '💬', body: `${actor} commented on your workout.` };
    case 'follow':
      return { icon: '👤', body: `${actor} started following you.` };
    case 'pr':
      return {
        icon: '🏆',
        body: `New PR on ${n.exercise?.name ?? 'an exercise'}!`,
      };
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
