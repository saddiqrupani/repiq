import { router } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/FeedCard';
import { useSession } from '@/hooks/useSession';
import { useFeed, useToggleReaction } from '@/hooks/useSocial';
import type { FeedPost } from '@/lib/db/types';

function PostRow({ post }: { post: FeedPost }) {
  const react = useToggleReaction(post.id);
  return (
    <FeedCard
      post={post}
      onOpen={() => router.push(`/post/${post.id}`)}
      onReact={(nextOn) => react.mutate(nextOn)}
      reactPending={react.isPending}
    />
  );
}

export default function HomeScreen() {
  useSession();
  const feed = useFeed();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-white">Feed</Text>
        <Text className="text-zinc-500 dark:text-zinc-400">
          Workouts from your gym crew.
        </Text>
      </View>

      <FlatList
        data={feed.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} />
        }
        ListEmptyComponent={
          <View className="mt-6 items-center gap-2 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              No workouts here yet
            </Text>
            <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Finish a workout and share it to your gym — it'll show up here for everyone in the
              crew.
            </Text>
          </View>
        }
        renderItem={({ item }) => <PostRow post={item} />}
      />
    </SafeAreaView>
  );
}
