import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWorkoutDetail } from '@/hooks/useWorkouts';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatDuration } from '@/lib/format';
import { kgToLb } from '@/lib/units';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useWorkoutDetail(id);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { name: string; equipment: string; sets: typeof data.sets }>();
    for (const s of data.sets) {
      const key = s.exercise_id;
      const existing = map.get(key);
      if (existing) {
        existing.sets.push(s);
      } else {
        map.set(key, {
          name: s.exercise.name,
          equipment: s.exercise.equipment,
          sets: [s],
        });
      }
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Workout</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        {isPending ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
        ) : isError ? (
          <Text className="text-red-500">Error: {errorMessage(error)}</Text>
        ) : !data ? (
          <Text className="text-zinc-500 dark:text-zinc-400">Not found.</Text>
        ) : (
          <>
            <View className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-900">
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {formatDate(data.started_at)}
              </Text>
              <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {new Date(data.started_at).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                · {formatDuration(data.started_at, data.ended_at)}
              </Text>
              {data.notes ? (
                <Text className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{data.notes}</Text>
              ) : null}
            </View>

            {grouped.length === 0 ? (
              <Text className="text-zinc-500 dark:text-zinc-400">No sets logged.</Text>
            ) : (
              grouped.map((g, i) => (
                <View
                  key={i}
                  className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {g.name}
                  </Text>
                  <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {g.equipment}
                  </Text>
                  <View className="mt-3 gap-1.5">
                    {g.sets.map((s, idx) => (
                      <View
                        key={s.id}
                        className="flex-row items-center rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                        <Text className="w-8 text-sm font-semibold text-zinc-900 dark:text-white">
                          {idx + 1}
                        </Text>
                        <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">
                          {g.equipment === 'bodyweight'
                            ? 'Bodyweight'
                            : s.weight_kg != null
                              ? `${kgToLb(s.weight_kg)} lb`
                              : '—'}
                        </Text>
                        <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                          {s.reps} reps
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
