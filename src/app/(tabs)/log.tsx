import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ExerciseSetsCard } from '@/components/ExerciseSetsCard';
import { FinishWorkoutSheet } from '@/components/FinishWorkoutSheet';
import { RestTimerBar } from '@/components/RestTimerBar';
import { SaveTemplateSheet } from '@/components/SaveTemplateSheet';
import { useGym, useMyProfile } from '@/hooks/useSocial';
import { useCreateTemplateFromWorkout } from '@/hooks/useTemplates';
import {
  useActiveWorkout,
  useAddSet,
  useCancelWorkout,
  useDeleteSet,
  useExercises,
  useFinishWorkout,
  useSetsForWorkout,
  useStartWorkout,
} from '@/hooks/useWorkouts';
import type { Exercise } from '@/lib/db/types';
import { useActiveWorkoutUi } from '@/stores/activeWorkoutUi';
import { useRestTimer } from '@/stores/restTimer';

function useElapsed(startedAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return null;
  const ms = now - new Date(startedAt).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function LogScreen() {
  const activeQuery = useActiveWorkout();
  const active = activeQuery.data ?? null;

  const startMutation = useStartWorkout();
  const finishMutation = useFinishWorkout();
  const cancelMutation = useCancelWorkout();

  const setsQuery = useSetsForWorkout(active?.id);
  const addSetMutation = useAddSet(active?.id ?? '');
  const deleteSetMutation = useDeleteSet(active?.id ?? '');

  const exercisesQuery = useExercises();
  const exerciseById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercisesQuery.data ?? []) m.set(e.id, e);
    return m;
  }, [exercisesQuery.data]);

  const { pickedExerciseIds, removePickedExercise, clear: clearPicked } = useActiveWorkoutUi();
  const startRest = useRestTimer((s) => s.start);
  const stopRest = useRestTimer((s) => s.stop);

  const profile = useMyProfile();
  const homeGym = useGym(profile.data?.home_gym_id ?? undefined);
  const [finishing, setFinishing] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const createTemplate = useCreateTemplateFromWorkout();

  const orderedExerciseIds = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of setsQuery.data ?? []) {
      if (!seen.has(s.exercise_id)) {
        seen.add(s.exercise_id);
        out.push(s.exercise_id);
      }
    }
    for (const id of pickedExerciseIds) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }, [setsQuery.data, pickedExerciseIds]);

  const elapsed = useElapsed(active?.started_at);

  function onStart() {
    startMutation.mutate();
  }

  function onFinish() {
    if (!active) return;
    if (!setsQuery.data || setsQuery.data.length === 0) {
      Alert.alert('No sets logged', 'Log at least one set or cancel the workout.', [
        { text: 'OK' },
      ]);
      return;
    }
    setFinishing(true);
  }

  function submitFinish(input: { title: string | null; shareToGymId: string | null }) {
    if (!active) return;
    finishMutation.mutate(
      { workoutId: active.id, ...input },
      {
        onSuccess: () => {
          clearPicked();
          stopRest();
          setFinishing(false);
        },
      },
    );
  }

  function onCancel() {
    if (!active) return;
    Alert.alert('Cancel workout?', 'This deletes the workout and all logged sets.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Cancel workout',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(active.id, {
            onSuccess: () => {
              clearPicked();
              stopRest();
            },
          }),
      },
    ]);
  }

  function openPicker() {
    router.push('/exercise-picker');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-end justify-between px-5 pt-2 pb-3">
        <View>
          <Text className="text-3xl font-bold text-zinc-900 dark:text-white">Workout</Text>
          {active ? (
            <Text className="mt-0.5 font-mono text-sm text-brand-500">{elapsed}</Text>
          ) : (
            <Text className="text-zinc-500 dark:text-zinc-400">
              Ready when you are.
            </Text>
          )}
        </View>
        {active ? (
          <View className="flex-row gap-3">
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text className="text-sm font-medium text-zinc-500">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onFinish}
              disabled={finishMutation.isPending}
              className="rounded-full bg-brand-500 px-4 py-2 active:bg-brand-600">
              <Text className="text-sm font-semibold text-white">
                {finishMutation.isPending ? 'Saving…' : 'Finish'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {active ? <RestTimerBar /> : null}

      <ScrollView
        contentContainerClassName="px-5 pt-3 pb-32 gap-4"
        keyboardShouldPersistTaps="handled">
        {!active ? (
          <>
            <View className="mt-8 items-center gap-4 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                No workout in progress
              </Text>
              <Text className="text-center text-zinc-500 dark:text-zinc-400">
                Start a workout to log sets, reps, and weight.
              </Text>
              <Button
                label={startMutation.isPending ? 'Starting…' : 'Start workout'}
                loading={startMutation.isPending}
                onPress={onStart}
              />
            </View>
            <Pressable
              onPress={() => router.push('/form-check')}
              className="mt-2 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white p-5 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  Form check
                </Text>
                <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Record a set — get depth, torso, and knee-tracking feedback.
                </Text>
              </View>
              <Text className="text-2xl text-brand-500">›</Text>
            </Pressable>
          </>
        ) : (
          <>
            {orderedExerciseIds.length === 0 ? (
              <View className="mt-4 items-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  Pick your first exercise
                </Text>
                <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Browse the catalog and start logging sets.
                </Text>
              </View>
            ) : (
              orderedExerciseIds.map((id) => {
                const ex = exerciseById.get(id);
                if (!ex) return null;
                const setsForEx = (setsQuery.data ?? []).filter((s) => s.exercise_id === id);
                return (
                  <ExerciseSetsCard
                    key={id}
                    exercise={ex}
                    sets={setsForEx}
                    isSubmitting={addSetMutation.isPending}
                    onAddSet={async ({ weightKg, reps }) => {
                      const position = (setsQuery.data?.length ?? 0) + 1;
                      await addSetMutation.mutateAsync({
                        exerciseId: id,
                        position,
                        weightKg,
                        reps,
                        rpe: null,
                      });
                      removePickedExercise(id);
                      startRest();
                    }}
                    onDeleteSet={(setId) => deleteSetMutation.mutate(setId)}
                    onRemoveExercise={
                      setsForEx.length === 0 ? () => removePickedExercise(id) : undefined
                    }
                  />
                );
              })
            )}

            <Pressable
              onPress={openPicker}
              className="mt-2 items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-4 active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:active:bg-zinc-800">
              <Text className="text-base font-semibold text-brand-500">+ Add exercise</Text>
            </Pressable>

            {(setsQuery.data ?? []).length > 0 ? (
              <Pressable
                onPress={() => setSavingTemplate(true)}
                className="items-center rounded-2xl bg-zinc-100 px-4 py-3 active:bg-zinc-200 dark:bg-zinc-800 dark:active:bg-zinc-700">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Save as template
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <SaveTemplateSheet
        visible={savingTemplate}
        submitting={createTemplate.isPending}
        onCancel={() => setSavingTemplate(false)}
        onSubmit={(name) => {
          if (!active) return;
          createTemplate.mutate(
            { workoutId: active.id, name },
            {
              onSuccess: () => {
                setSavingTemplate(false);
                Alert.alert('Saved', `Template "${name}" saved.`);
              },
              onError: (e) => Alert.alert('Save failed', e.message),
            },
          );
        }}
      />

      <FinishWorkoutSheet
        visible={finishing}
        homeGymId={profile.data?.home_gym_id ?? null}
        homeGymName={homeGym.data?.name ?? null}
        submitting={finishMutation.isPending}
        onCancel={() => setFinishing(false)}
        onSubmit={submitFinish}
      />
    </SafeAreaView>
  );
}
