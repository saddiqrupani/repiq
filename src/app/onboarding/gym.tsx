import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useCreateGym, useGymSearch, useJoinGym, useSetHomeGym } from '@/hooks/useSocial';
import { errorMessage } from '@/lib/errors';
import type { Gym } from '@/lib/db/types';

export default function OnboardingGymScreen() {
  const [query, setQuery] = useState('');
  const gyms = useGymSearch(query);
  const joinGym = useJoinGym();
  const setHomeGym = useSetHomeGym();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const createGym = useCreateGym();

  async function pick(gym: Gym) {
    try {
      await joinGym.mutateAsync(gym.id);
      await setHomeGym.mutateAsync(gym.id);
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('Could not join', errorMessage(e));
    }
  }

  async function submitCreate() {
    if (name.trim().length < 2) {
      Alert.alert('Name required', 'Gym name needs at least 2 characters.');
      return;
    }
    try {
      const gym = await createGym.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
      });
      await pick(gym);
    } catch (e) {
      Alert.alert('Could not create', errorMessage(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
          Pick your home gym
        </Text>
        <Text className="mt-1 text-zinc-500 dark:text-zinc-400">
          Your gym crew shares workouts and challenges here.
        </Text>
      </View>

      {creating ? (
        <View className="flex-1 gap-3 px-5">
          <TextField label="Gym name" value={name} onChangeText={setName} autoFocus />
          <TextField
            label="City (optional)"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Austin, TX"
          />
          <Button
            label={createGym.isPending ? 'Creating…' : 'Create & join'}
            loading={createGym.isPending}
            onPress={submitCreate}
          />
          <Button label="Cancel" variant="ghost" onPress={() => setCreating(false)} />
        </View>
      ) : (
        <>
          <View className="px-5">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search gyms…"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </View>

          <FlatList
            data={gyms.data ?? []}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <Text className="pt-8 text-center text-zinc-500 dark:text-zinc-400">
                {gyms.isPending ? 'Loading…' : 'No matches — create yours below.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick(item)}
                disabled={joinGym.isPending || setHomeGym.isPending}
                className="rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  {item.name}
                </Text>
                {item.city ? (
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">{item.city}</Text>
                ) : null}
              </Pressable>
            )}
          />

          <View className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <Button
              label="+ Create a new gym"
              variant="secondary"
              onPress={() => setCreating(true)}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
