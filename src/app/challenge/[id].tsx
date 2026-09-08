import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSession } from '@/hooks/useSession';
import {
  useChallenge,
  useChallengeLeaderboard,
  useJoinChallenge,
  useLeaveChallenge,
} from '@/hooks/useSocial';
import { formatDate } from '@/lib/format';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session?.user.id;
  const challenge = useChallenge(id);
  const leaderboard = useChallengeLeaderboard(challenge.data);
  const join = useJoinChallenge(id!);
  const leave = useLeaveChallenge(id!);

  const iAmIn = useMemo(
    () => !!uid && !!leaderboard.data?.some((r) => r.user_id === uid),
    [leaderboard.data, uid],
  );

  const now = Date.now();
  const daysLeft = challenge.data
    ? Math.max(0, Math.ceil((new Date(challenge.data.ends_at).getTime() - now) / (24 * 3600 * 1000)))
    : 0;
  const goal = challenge.data?.goal_value ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Challenge</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        {challenge.isPending ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
        ) : !challenge.data ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Not found.</Text>
        ) : (
          <>
            <View className="gap-1">
              <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
                {challenge.data.name}
              </Text>
              {challenge.data.description ? (
                <Text className="text-zinc-500 dark:text-zinc-400">
                  {challenge.data.description}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900">
                <Text className="text-xs uppercase text-zinc-500">Goal</Text>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                  {goal} workouts
                </Text>
              </View>
              <View className="flex-1 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900">
                <Text className="text-xs uppercase text-zinc-500">Ends</Text>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                  {formatDate(challenge.data.ends_at)}
                </Text>
                <Text className="text-xs text-zinc-500">{daysLeft} days left</Text>
              </View>
            </View>

            <Button
              label={
                iAmIn
                  ? leave.isPending
                    ? 'Leaving…'
                    : 'Leave challenge'
                  : join.isPending
                    ? 'Joining…'
                    : 'Join challenge'
              }
              variant={iAmIn ? 'secondary' : 'primary'}
              loading={join.isPending || leave.isPending}
              onPress={() => (iAmIn ? leave.mutate() : join.mutate())}
            />

            <View className="mt-2 gap-2">
              <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                Leaderboard
              </Text>
              {leaderboard.isPending ? (
                <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
              ) : (leaderboard.data ?? []).length === 0 ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  No one's joined yet.
                </Text>
              ) : (
                (leaderboard.data ?? []).map((row, i) => {
                  const pct = goal > 0 ? Math.min(1, row.count / goal) : 0;
                  return (
                    <Pressable
                      key={row.user_id}
                      onPress={() => router.push(`/user/${row.user_id}`)}
                      className="rounded-2xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                      <View className="flex-row items-center gap-3">
                        <Text className="w-6 text-sm font-bold text-zinc-500">{i + 1}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {row.display_name ?? row.username}
                            {row.user_id === uid ? ' (you)' : ''}
                          </Text>
                          <View className="mt-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <View
                              style={{ width: `${pct * 100}%` }}
                              className="h-1.5 rounded-full bg-brand-500"
                            />
                          </View>
                        </View>
                        <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {row.count}/{goal}
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
