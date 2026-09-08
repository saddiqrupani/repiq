import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { useAnalyzeVideo, useMyFormAnalyses } from '@/hooks/useFormAnalysis';
import type { Exercise } from '@/lib/db/types';

// Central form-check hub: pick exercise + video, kick off analysis, show past checks.
export default function FormCheckHub() {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const analyze = useAnalyzeVideo();
  const { data: history = [], isPending } = useMyFormAnalyses();

  async function pickVideo(source: 'library' | 'camera') {
    // iOS Simulator has no camera; UIImagePickerController crashes when configured with .camera.
    if (source === 'camera' && !Device.isDevice) {
      Alert.alert('Not supported', 'Camera capture is only available on a physical device. Use Library to pick a saved video.');
      return;
    }
    const perm =
      source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Grant access to record or pick a video.');
      return;
    }
    // Library path uses PHPicker (no allowsEditing) which handles ['videos'] fine.
    // Camera path uses the legacy UIImagePickerController; keep videoMaxDuration only there.
    const opts: ImagePicker.ImagePickerOptions =
      source === 'library'
        ? { mediaTypes: ['videos'], quality: 0.7 }
        : { mediaTypes: ['videos'], videoMaxDuration: 15, quality: 0.7 };
    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync(opts)
        : await ImagePicker.launchCameraAsync(opts);
    if (result.canceled) return;
    setVideoUri(result.assets[0].uri);
  }

  async function submit() {
    if (!exercise || !videoUri) return;
    try {
      const created = await analyze.mutateAsync({
        localUri: videoUri,
        exerciseId: exercise.id,
      });
      router.push(`/form-check/${created.id}`);
      setVideoUri(null);
    } catch (e) {
      Alert.alert('Analysis failed', e instanceof Error ? e.message : String(e));
    }
  }

  const canSubmit = !!exercise && !!videoUri && !analyze.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">
          Form Check
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Text className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            New check
          </Text>
          <Text className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
            Record 3–5 reps from the side. We&apos;ll score your depth, torso lean, and knee tracking.
          </Text>

          <Pressable
            onPress={() => setPickerOpen(true)}
            className="mb-3 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
            <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Exercise
            </Text>
            <Text className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-white">
              {exercise ? exercise.name : 'Tap to pick'}
            </Text>
          </Pressable>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="Record" variant="secondary" onPress={() => pickVideo('camera')} />
            </View>
            <View className="flex-1">
              <Button label="Library" variant="secondary" onPress={() => pickVideo('library')} />
            </View>
          </View>

          {videoUri ? (
            <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Video selected. Ready to analyze.
            </Text>
          ) : null}

          <View className="mt-3">
            <Button
              label={analyze.isPending ? 'Analyzing…' : 'Analyze'}
              loading={analyze.isPending}
              onPress={submit}
              disabled={!canSubmit}
            />
          </View>
        </View>

        <Text className="mt-4 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Past checks
        </Text>
        {isPending ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</Text>
        ) : history.length === 0 ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            No form checks yet — run your first one above.
          </Text>
        ) : (
          history.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/form-check/${h.id}`)}
              className="rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  {h.exercise.name}
                </Text>
                <Text
                  className={`text-base font-bold ${
                    h.status === 'complete'
                      ? 'text-brand-500'
                      : h.status === 'failed'
                        ? 'text-red-500'
                        : 'text-zinc-500'
                  }`}>
                  {h.status === 'complete' && h.score !== null ? `${h.score}` : h.status}
                </Text>
              </View>
              <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(h.created_at).toLocaleString()}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ex) => {
          setExercise(ex);
          setPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
