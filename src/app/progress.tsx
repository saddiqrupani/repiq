import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressChart } from '@/components/ProgressChart';
import { useExercisesWithHistory, useExerciseProgress, usePersonalRecord } from '@/hooks/useProgress';
import { useExercises } from '@/hooks/useWorkouts';
import { kgToLb } from '@/lib/units';

const WINDOWS: Array<{ label: string; days: number }> = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

export default function ProgressScreen() {
  const exercisesQuery = useExercises();
  const historyQuery = useExercisesWithHistory();
  const historySet = useMemo(() => new Set(historyQuery.data ?? []), [historyQuery.data]);

  const trained = useMemo(
    () => (exercisesQuery.data ?? []).filter((e) => historySet.has(e.id)),
    [exercisesQuery.data, historySet],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? trained[0]?.id ?? null;
  const active = trained.find((e) => e.id === activeId) ?? null;

  const [days, setDays] = useState(90);
  const progress = useExerciseProgress(activeId ?? undefined, days);
  const pr = usePersonalRecord(activeId ?? undefined);

  const loading = exercisesQuery.isPending || historyQuery.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Progress</Text>
        <View className="w-12" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, gap: 16 }}
        keyboardShouldPersistTaps="handled">
        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : trained.length === 0 ? (
          <View className="mt-8 items-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
              No progress yet
            </Text>
            <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Log a few weighted sets and come back — charts appear per exercise.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {trained.map((e) => {
                const isActive = e.id === activeId;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setSelectedId(e.id)}
                    className={`rounded-full px-4 py-2 ${
                      isActive ? 'bg-brand-500' : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}>
                    <Text
                      className={`text-sm font-medium ${
                        isActive ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'
                      }`}>
                      {e.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="flex-row gap-2">
              {WINDOWS.map((w) => {
                const isActive = w.days === days;
                return (
                  <Pressable
                    key={w.days}
                    onPress={() => setDays(w.days)}
                    className={`flex-1 items-center rounded-full py-2 ${
                      isActive ? 'bg-brand-500' : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}>
                    <Text
                      className={`text-sm font-medium ${
                        isActive ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'
                      }`}>
                      {w.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {pr.data && active ? (
              <View className="rounded-3xl border border-brand-500/30 bg-brand-500/5 p-4">
                <Text className="text-xs uppercase tracking-wide text-brand-500">
                  {active.name} PR
                </Text>
                <View className="mt-1 flex-row items-baseline gap-2">
                  <Text className="text-3xl font-black text-zinc-900 dark:text-white">
                    {kgToLb(pr.data.est_1rm_kg)}
                  </Text>
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    est. 1RM · {kgToLb(pr.data.weight_kg)} lb × {pr.data.reps}
                  </Text>
                </View>
              </View>
            ) : null}

            {progress.isPending ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <ProgressChart points={progress.data ?? []} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
