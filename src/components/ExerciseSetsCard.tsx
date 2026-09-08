import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import type { Exercise, WorkoutSet } from '@/lib/db/types';
import { kgToLb, lbToKg } from '@/lib/units';

type Props = {
  exercise: Exercise;
  sets: WorkoutSet[];
  isSubmitting: boolean;
  onAddSet: (input: { weightKg: number | null; reps: number }) => Promise<void>;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise?: () => void;
};

const numeric = (v: string) => v.replace(/[^0-9.]/g, '');

export function ExerciseSetsCard({
  exercise,
  sets,
  isSubmitting,
  onAddSet,
  onDeleteSet,
  onRemoveExercise,
}: Props) {
  const isBodyweight = exercise.equipment === 'bodyweight';
  const last = sets[sets.length - 1];
  const defaultWeight = useMemo(() => {
    if (isBodyweight) return '';
    if (last?.weight_kg != null) return String(kgToLb(last.weight_kg));
    return '';
  }, [isBodyweight, last]);
  const defaultReps = last?.reps ? String(last.reps) : '';

  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);

  async function handleLog() {
    const repsNum = parseInt(reps, 10);
    if (!repsNum || repsNum < 1) {
      Alert.alert('Reps required', 'Enter how many reps you did.');
      return;
    }
    let weightKg: number | null = null;
    if (!isBodyweight) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 0) {
        Alert.alert('Weight required', 'Enter the weight in pounds.');
        return;
      }
      weightKg = lbToKg(w);
    }
    await onAddSet({ weightKg, reps: repsNum });
    setReps(String(repsNum));
    if (!isBodyweight) setWeight(weight);
  }

  return (
    <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
            {exercise.name}
          </Text>
          <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {exercise.equipment} · {exercise.primary_muscle}
          </Text>
        </View>
        {sets.length === 0 && onRemoveExercise ? (
          <Pressable onPress={onRemoveExercise} hitSlop={8}>
            <Text className="text-sm font-medium text-zinc-400">Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {sets.length > 0 ? (
        <View className="mt-3 gap-1.5">
          <View className="flex-row px-1">
            <Text className="w-8 text-xs font-medium text-zinc-400">#</Text>
            <Text className="flex-1 text-xs font-medium text-zinc-400">Weight</Text>
            <Text className="w-16 text-xs font-medium text-zinc-400">Reps</Text>
            <View className="w-6" />
          </View>
          {sets.map((s, i) => (
            <View
              key={s.id}
              className={`flex-row items-center rounded-xl px-1 py-2 ${
                s.is_pr ? 'bg-brand-500/10' : 'bg-zinc-50 dark:bg-zinc-800/50'
              }`}>
              <Text className="w-8 pl-2 text-sm font-semibold text-zinc-900 dark:text-white">
                {i + 1}
              </Text>
              <View className="flex-1 flex-row items-center gap-1.5">
                <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                  {isBodyweight
                    ? 'Bodyweight'
                    : s.weight_kg != null
                      ? `${kgToLb(s.weight_kg)} lb`
                      : '—'}
                </Text>
                {s.is_pr ? (
                  <Text className="text-xs font-bold text-brand-500">PR</Text>
                ) : null}
              </View>
              <Text className="w-16 text-sm text-zinc-700 dark:text-zinc-200">{s.reps}</Text>
              <Pressable onPress={() => onDeleteSet(s.id)} hitSlop={8} className="w-6 items-center">
                <Text className="text-zinc-400">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center gap-2">
        <View className="w-8 pl-2">
          <Text className="text-sm font-semibold text-brand-500">{sets.length + 1}</Text>
        </View>
        {isBodyweight ? (
          <View className="flex-1">
            <Text className="text-sm text-zinc-400">Bodyweight</Text>
          </View>
        ) : (
          <TextInput
            value={weight}
            onChangeText={(v) => setWeight(numeric(v))}
            placeholder="lb"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        )}
        <TextInput
          value={reps}
          onChangeText={(v) => setReps(numeric(v))}
          placeholder="reps"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          className="w-16 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
        <Pressable
          onPress={handleLog}
          disabled={isSubmitting}
          className={`h-11 w-11 items-center justify-center rounded-xl bg-brand-500 active:bg-brand-600 ${isSubmitting ? 'opacity-60' : ''}`}>
          <Text className="text-lg font-bold text-white">✓</Text>
        </Pressable>
      </View>
    </View>
  );
}
