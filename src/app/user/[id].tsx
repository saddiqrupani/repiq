import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSession } from '@/hooks/useSession';
import {
  useFollowCounts,
  useFollowState,
  useGym,
  useProfileById,
  useToggleFollow,
  useUserRecentShared,
} from '@/hooks/useSocial';
import { formatDate } from '@/lib/format';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const isMe = session?.user.id === id;
  const profile = useProfileById(id);
  const gym = useGym(profile.data?.home_gym_id ?? undefined);
  const followState = useFollowState(id);
  const followCounts = useFollowCounts(id);
  const toggleFollow = useToggleFollow(id!);
  const recent = useUserRecentShared(id);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Profile</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        {profile.isPending ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
        ) : !profile.data ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Not found.</Text>
        ) : (
          <>
            <View className="items-center gap-3">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-500/20">
                <Text className="text-3xl font-bold text-brand-500">
                  {(
                    profile.data.display_name ?? profile.data.username
                  )[0]?.toUpperCase()}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {profile.data.display_name ?? profile.data.username}
                </Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  @{profile.data.username}
                </Text>
              </View>
              {gym.data ? (
                <Pressable onPress={() => router.push(`/gym/${gym.data!.id}`)}>
                  <Text className="text-sm text-brand-500">{gym.data.name}</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="flex-row justify-center gap-8 py-2">
              <View className="items-center">
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                  {followCounts.data?.followers ?? 0}
                </Text>
                <Text className="text-xs uppercase text-zinc-500">Followers</Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                  {followCounts.data?.following ?? 0}
                </Text>
                <Text className="text-xs uppercase text-zinc-500">Following</Text>
              </View>
            </View>

            {!isMe ? (
              <Button
                label={
                  toggleFollow.isPending
                    ? 'Saving…'
                    : followState.data
                      ? 'Following'
                      : 'Follow'
                }
                variant={followState.data ? 'secondary' : 'primary'}
                loading={toggleFollow.isPending}
                onPress={() => toggleFollow.mutate(!followState.data)}
              />
            ) : null}

            <View className="mt-3 gap-2">
              <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                Recent workouts
              </Text>
              {recent.isPending ? (
                <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
              ) : (recent.data ?? []).length === 0 ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">None yet.</Text>
              ) : (
                (recent.data ?? []).map((w) => {
                  const visible = w.visibility === 'gym' || isMe;
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => {
                        if (visible) router.push(`/post/${w.id}`);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-zinc-900 dark:text-white">
                          {w.title ?? formatDate(w.started_at)}
                        </Text>
                        <Text className="text-xs text-zinc-500">
                          {w.visibility === 'gym' ? 'shared' : 'private'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
