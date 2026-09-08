import { useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';

type Props = {
  visible: boolean;
  homeGymName: string | null;
  homeGymId: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: { title: string | null; shareToGymId: string | null }) => void;
};

export function FinishWorkoutSheet({
  visible,
  homeGymName,
  homeGymId,
  submitting,
  onCancel,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState('');
  const [share, setShare] = useState(true);

  function submit() {
    if (share && !homeGymId) {
      Alert.alert('No home gym', 'Set a home gym in Profile before sharing.');
      return;
    }
    onSubmit({
      title: title.trim() || null,
      shareToGymId: share ? homeGymId : null,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 bg-black/50" />
      <View className="absolute bottom-0 left-0 right-0 gap-4 rounded-t-3xl bg-white p-6 pb-10 dark:bg-zinc-900">
        <View className="items-center">
          <View className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </View>
        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
          Finish workout
        </Text>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Title (optional)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Push day"
            placeholderTextColor="#9ca3af"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
          />
        </View>

        <Pressable
          onPress={() => setShare((s) => !s)}
          className="flex-row items-center justify-between rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              Share to {homeGymName ?? 'your gym'}
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              {share ? 'Your gym crew can see this workout.' : 'Kept private to you.'}
            </Text>
          </View>
          <View
            className={`h-7 w-12 rounded-full ${share ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-700'} p-0.5`}>
            <View
              className={`h-6 w-6 rounded-full bg-white ${share ? 'ml-5' : 'ml-0'}`}
            />
          </View>
        </Pressable>

        <Button
          label={submitting ? 'Saving…' : share ? 'Finish & share' : 'Finish workout'}
          loading={submitting}
          onPress={submit}
        />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </Modal>
  );
}
