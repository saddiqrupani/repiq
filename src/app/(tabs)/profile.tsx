import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSession } from '@/hooks/useSession';
import {
  useFollowCounts,
  useGym,
  useMyProfile,
  useUserRecentShared,
} from '@/hooks/useSocial';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useSession();
  const uid = session?.user.id;
  const profile = useMyProfile();
  const gym = useGym(profile.data?.home_gym_id ?? undefined);
  const counts = useFollowCounts(uid);
  const recent = useUserRecentShared(uid);

  async function onSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign out failed', error.message);
      return;
    }
    router.replace('/(auth)/sign-in');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-4 pb-24 gap-6">
        <View className="items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-500/20">
            <Text className="text-3xl font-bold text-brand-500">
              {(
                profile.data?.display_name ??
                profile.data?.username ??
                session?.user.email ??
                '?'
              )[0]?.toUpperCase()}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
              {profile.data?.display_name ?? profile.data?.username ?? '—'}
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              {session?.user.email}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-center gap-8">
          <View className="items-center">
            <Text className="text-lg font-bold text-zinc-900 dark:text-white">
              {counts.data?.followers ?? 0}
            </Text>
            <Text className="text-xs uppercase text-zinc-500">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-zinc-900 dark:text-white">
              {counts.data?.following ?? 0}
            </Text>
            <Text className="text-xs uppercase text-zinc-500">Following</Text>
          </View>
        </View>

        <Pressable
          onPress={() => gym.data && router.push(`/gym/${gym.data.id}`)}
          className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
          <Text className="text-xs uppercase tracking-wide text-brand-500">Home gym</Text>
          <Text className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
            {gym.data?.name ?? '—'}
          </Text>
          {gym.data?.city ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">{gym.data.city}</Text>
          ) : null}
          <Text className="mt-2 text-xs text-zinc-500">Tap to view members & challenges</Text>
        </Pressable>

        <Button
          label="Change home gym"
          variant="secondary"
          onPress={() => router.push('/onboarding/gym')}
        />

        <Pressable
          onPress={() => router.push('/progress')}
          className="flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              Progress
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              PRs and est-1RM trends per exercise.
            </Text>
          </View>
          <Text className="text-2xl text-brand-500">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/templates')}
          className="flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              Templates
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Reuse workouts you've saved as templates.
            </Text>
          </View>
          <Text className="text-2xl text-brand-500">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/form-check')}
          className="flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              Form checks
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Review AI-scored lift videos.
            </Text>
          </View>
          <Text className="text-2xl text-brand-500">›</Text>
        </Pressable>

        <View className="gap-2">
          <Text className="text-base font-semibold text-zinc-900 dark:text-white">
            Your recent workouts
          </Text>
          {recent.isPending ? (
            <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
          ) : (recent.data ?? []).length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">None yet.</Text>
          ) : (
            (recent.data ?? []).map((w) => (
              <Pressable
                key={w.id}
                onPress={() =>
                  w.visibility === 'gym'
                    ? router.push(`/post/${w.id}`)
                    : router.push(`/workout/${w.id}`)
                }
                className="rounded-2xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-zinc-900 dark:text-white">
                    {w.title ?? new Date(w.started_at).toLocaleDateString()}
                  </Text>
                  <Text className="text-xs text-zinc-500">
                    {w.visibility === 'gym' ? 'shared' : 'private'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Button label="Sign out" variant="secondary" onPress={onSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}
