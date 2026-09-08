import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';

type Props = {
  visible: boolean;
  submitting: boolean;
  defaultName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

export function SaveTemplateSheet({
  visible,
  submitting,
  defaultName,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(defaultName ?? '');

  useEffect(() => {
    if (visible) setName(defaultName ?? '');
  }, [visible, defaultName]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 bg-black/50" />
      <View className="absolute bottom-0 left-0 right-0 gap-4 rounded-t-3xl bg-white p-6 pb-10 dark:bg-zinc-900">
        <View className="items-center">
          <View className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </View>
        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
          Save as template
        </Text>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Snapshots exercise order and target reps. Weight isn't saved.
        </Text>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push A"
            placeholderTextColor="#9ca3af"
            autoFocus
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
          />
        </View>

        <Button
          label={submitting ? 'Saving…' : 'Save template'}
          loading={submitting}
          disabled={!name.trim()}
          onPress={() => onSubmit(name.trim())}
        />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </Modal>
  );
}
