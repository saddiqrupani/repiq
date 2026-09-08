import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSession } from '@/hooks/useSession';
import {
  useGym,
  useGymChallenges,
  useGymMembers,
  useJoinGym,
  useLeaveGym,
  useSetHomeGym,
  useMyProfile,
} from '@/hooks/useSocial';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session?.user.id;
  const gym = useGym(id);
  const members = useGymMembers(id);
  const challenges = useGymChallenges(id);
  const profile = useMyProfile();
  const joinGym = useJoinGym();
  const leaveGym = useLeaveGym();
  const setHomeGym = useSetHomeGym();

  const isMember = !!members.data?.some((m) => m.user_id === uid);
  const isHome = profile.data?.home_gym_id === id;

  async function onToggleMembership() {
    if (!id) return;
    try {
      if (isMember) {
        if (isHome) await setHomeGym.mutateAsync(null);
        await leaveGym.mutateAsync(id);
      } else {
        await joinGym.mutateAsync(id);
      }
    } catch (e) {
      Alert.alert('Could not update gym', errorMessage(e));
    }
  }

  async function onMakeHome() {
    if (!id) return;
    try {
      if (!isMember) await joinGym.mutateAsync(id);
      await setHomeGym.mutateAsync(id);
    } catch (e) {
      Alert.alert('Could not set home gym', errorMessage(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Gym</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        <View>
          <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
            {gym.data?.name ?? 'Loading…'}
          </Text>
          {gym.data?.city ? (
            <Text className="mt-1 text-zinc-500 dark:text-zinc-400">{gym.data.city}</Text>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={isMember ? 'Leave gym' : 'Join gym'}
              variant={isMember ? 'secondary' : 'primary'}
              loading={joinGym.isPending || leaveGym.isPending || setHomeGym.isPending}
              onPress={onToggleMembership}
            />
          </View>
          {!isHome ? (
            <View className="flex-1">
              <Button
                label="Make home"
                variant="secondary"
                onPress={onMakeHome}
                loading={joinGym.isPending || setHomeGym.isPending}
              />
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              Challenges
            </Text>
            {isMember ? (
              <Pressable
                onPress={() => router.push(`/challenge/new?gymId=${id}`)}
                hitSlop={8}>
                <Text className="text-sm font-medium text-brand-500">+ New</Text>
              </Pressable>
            ) : null}
          </View>
          {challenges.isPending ? (
            <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
          ) : (challenges.data ?? []).length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              None yet. Start one for the crew.
            </Text>
          ) : (
            (challenges.data ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/challenge/${c.id}`)}
                className="rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                    {c.name}
                  </Text>
                  {c.joined ? (
                    <Text className="text-xs font-semibold uppercase text-brand-500">
                      Joined
                    </Text>
                  ) : null}
                </View>
                <Text className="mt-0.5 text-xs text-zinc-500">
                  Goal: {c.goal_value} workouts · ends {formatDate(c.ends_at)}
                </Text>
                <Text className="text-xs text-zinc-500">
                  {c.participant_count}{' '}
                  {c.participant_count === 1 ? 'participant' : 'participants'}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold text-zinc-900 dark:text-white">
            Members ({members.data?.length ?? 0})
          </Text>
          {members.isPending ? (
            <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
          ) : (members.data ?? []).length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              No members yet — be the first.
            </Text>
          ) : (
            (members.data ?? []).map((m) => (
              <Pressable
                key={m.user_id}
                onPress={() => router.push(`/user/${m.user_id}`)}
                className="flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-500/20">
                  <Text className="font-semibold text-brand-500">
                    {(m.profile.display_name ?? m.profile.username)[0]?.toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {m.profile.display_name ?? m.profile.username}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    @{m.profile.username}
                  </Text>
                </View>
                {m.user_id === uid ? (
                  <Text className="text-xs uppercase text-zinc-400">you</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
