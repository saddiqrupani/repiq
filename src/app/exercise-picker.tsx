import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExercises } from '@/hooks/useWorkouts';
import type { Exercise } from '@/lib/db/types';
import { useActiveWorkoutUi } from '@/stores/activeWorkoutUi';

export default function ExercisePickerScreen() {
  const { data: exercises = [], isPending } = useExercises();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Exercise['equipment']>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (filter !== 'all' && e.equipment !== filter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.primary_muscle.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q)
      );
    });
  }, [exercises, query, filter]);

  const addPicked = useActiveWorkoutUi((s) => s.addPickedExercise);

  function onPick(ex: Exercise) {
    addPicked(ex.id);
    router.back();
  }

  const filters: Array<{ key: 'all' | Exercise['equipment']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'barbell', label: 'Barbell' },
    { key: 'dumbbell', label: 'Dumbbell' },
    { key: 'machine', label: 'Machine' },
    { key: 'cable', label: 'Cable' },
    { key: 'bodyweight', label: 'Bodyweight' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Pick exercise</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-zinc-500">Cancel</Text>
        </Pressable>
      </View>

      <View className="px-5">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises…"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
        />
      </View>

      <View className="mt-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable
                onPress={() => setFilter(item.key)}
                className={`rounded-full px-3.5 py-1.5 ${
                  active
                    ? 'bg-brand-500'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                <Text
                  className={`text-sm font-medium ${
                    active ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'
                  }`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Text className="text-zinc-500 dark:text-zinc-400">
              {isPending ? 'Loading…' : 'No matches'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item)}
            className="rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              {item.name}
            </Text>
            <Text className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {item.equipment} · {item.primary_muscle}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
