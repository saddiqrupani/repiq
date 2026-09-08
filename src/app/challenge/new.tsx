import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useCreateChallenge, useJoinChallenge } from '@/hooks/useSocial';

const DURATION_CHOICES: Array<{ label: string; days: number }> = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

// Creator auto-joins so they're on the leaderboard from the start.
function AutoJoinAndRedirect({ id }: { id: string }) {
  const join = useJoinChallenge(id);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    join.mutateAsync().finally(() => router.replace(`/challenge/${id}`));
  }, [id, join]);
  return null;
}

export default function NewChallengeScreen() {
  const { gymId } = useLocalSearchParams<{ gymId?: string }>();
  const create = useCreateChallenge();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('8');
  const [days, setDays] = useState(14);
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);

  async function submit() {
    if (name.trim().length < 3) {
      Alert.alert('Name required', 'Give the challenge a name (min 3 chars).');
      return;
    }
    const goalValue = parseInt(goal, 10);
    if (!goalValue || goalValue < 1) {
      Alert.alert('Goal required', 'Enter a positive number.');
      return;
    }
    const endsAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    try {
      const created = await create.mutateAsync({
        gymId: gymId ?? null,
        name: name.trim(),
        description: description.trim() || null,
        goalValue,
        endsAt,
      });
      setPendingJoin(created.id);
    } catch (e) {
      Alert.alert('Could not create', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">Cancel</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">
          New challenge
        </Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 gap-4">
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Bench week" />
        <TextField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Push each other, no excuses."
          multiline
        />
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Workouts to complete
          </Text>
          <TextField
            value={goal}
            onChangeText={(v) => setGoal(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Duration</Text>
          <View className="flex-row gap-2">
            {DURATION_CHOICES.map((d) => {
              const active = days === d.days;
              return (
                <Pressable
                  key={d.days}
                  onPress={() => setDays(d.days)}
                  className={`flex-1 rounded-2xl px-3 py-3 ${
                    active
                      ? 'bg-brand-500'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                  <Text
                    className={`text-center text-sm font-semibold ${
                      active ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'
                    }`}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Button
          label={create.isPending ? 'Creating…' : 'Create & join'}
          loading={create.isPending}
          onPress={submit}
        />
      </ScrollView>

      {pendingJoin ? <AutoJoinAndRedirect id={pendingJoin} /> : null}
    </SafeAreaView>
  );
}
