import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExercises } from '@/hooks/useWorkouts';
import type { Exercise } from '@/lib/db/types';

// Lightweight in-place exercise picker. Doesn't touch the active-workout
// store, so it's safe to use outside the log flow (e.g. form-check).
export function ExercisePickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
}) {
  const { data: exercises = [], isPending } = useExercises();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primary_muscle.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <Text className="text-xl font-bold text-zinc-900 dark:text-white">Pick exercise</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-base font-medium text-brand-500">Cancel</Text>
          </Pressable>
        </View>
        <View className="px-5">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search…"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
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
    </Modal>
  );
}
