import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyTemplates, useDeleteTemplate, useTemplate } from '@/hooks/useTemplates';
import { useActiveWorkout, useStartWorkout } from '@/hooks/useWorkouts';
import { useActiveWorkoutUi } from '@/stores/activeWorkoutUi';

export default function TemplatesScreen() {
  const list = useMyTemplates();
  const del = useDeleteTemplate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Templates</Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, gap: 12 }}>
        {list.isPending ? (
          <View className="items-center pt-16">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : (list.data ?? []).length === 0 ? (
          <View className="mt-8 items-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
              No templates yet
            </Text>
            <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Finish a workout, then tap "Save as template" on the Log screen.
            </Text>
          </View>
        ) : (
          (list.data ?? []).map((t) => (
            <TemplateRow
              key={t.id}
              id={t.id}
              name={t.name}
              expanded={expandedId === t.id}
              onToggle={() => setExpandedId((cur) => (cur === t.id ? null : t.id))}
              onDelete={() =>
                Alert.alert('Delete template?', `"${t.name}" will be removed.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => del.mutate(t.id) },
                ])
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateRow({
  id,
  name,
  expanded,
  onToggle,
  onDelete,
}: {
  id: string;
  name: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const detail = useTemplate(expanded ? id : undefined);
  const active = useActiveWorkout();
  const startMutation = useStartWorkout();
  const clearPicked = useActiveWorkoutUi((s) => s.clear);
  const addPicked = useActiveWorkoutUi((s) => s.addPickedExercise);

  const exerciseNames = useMemo(
    () => (detail.data?.exercises ?? []).map((e) => e.exercise.name).join(' · '),
    [detail.data],
  );

  async function onStart() {
    if (active.data) {
      Alert.alert('Workout in progress', 'Finish or cancel your current workout first.');
      return;
    }
    if (!detail.data) return;
    clearPicked();
    for (const e of detail.data.exercises) addPicked(e.exercise_id);
    startMutation.mutate(undefined, {
      onSuccess: () => router.replace('/(tabs)/log'),
    });
  }

  return (
    <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Pressable onPress={onToggle} className="flex-row items-center justify-between">
        <Text className="flex-1 text-base font-semibold text-zinc-900 dark:text-white">{name}</Text>
        <Text className="text-brand-500">{expanded ? '−' : '›'}</Text>
      </Pressable>

      {expanded ? (
        detail.isPending ? (
          <ActivityIndicator className="mt-3" color="#10b981" />
        ) : (
          <>
            <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{exerciseNames || 'No exercises'}</Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={onStart}
                disabled={startMutation.isPending}
                className={`flex-1 items-center rounded-full bg-brand-500 py-2 active:bg-brand-600 ${
                  startMutation.isPending ? 'opacity-60' : ''
                }`}>
                <Text className="text-sm font-semibold text-white">
                  {startMutation.isPending ? 'Starting…' : 'Start workout'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                className="items-center rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                <Text className="text-sm font-medium text-zinc-500">Delete</Text>
              </Pressable>
            </View>
          </>
        )
      ) : null}
    </View>
  );
}
