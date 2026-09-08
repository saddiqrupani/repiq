import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { REST_PRESETS_SEC, useRestTimer } from '@/stores/restTimer';

export function RestTimerBar() {
  const startedAt = useRestTimer((s) => s.startedAt);
  const targetSec = useRestTimer((s) => s.targetSec);
  const stop = useRestTimer((s) => s.stop);
  const setTarget = useRestTimer((s) => s.setTarget);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsedSec = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const remaining = Math.max(0, targetSec - elapsedSec);
  const overtime = elapsedSec > targetSec ? elapsedSec - targetSec : 0;
  const done = startedAt !== null && remaining === 0;

  if (!startedAt) {
    return (
      <View className="mx-5 mt-1 flex-row items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
        <Text className="mr-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Rest
        </Text>
        {REST_PRESETS_SEC.map((sec) => (
          <Pressable
            key={sec}
            onPress={() => setTarget(sec)}
            className={`rounded-full px-3 py-1 ${
              targetSec === sec ? 'bg-brand-500' : 'bg-transparent'
            }`}>
            <Text
              className={`text-xs font-semibold ${
                targetSec === sec ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
              {sec < 60 ? `${sec}s` : `${sec / 60}m`}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const label = done
    ? `+${fmt(overtime)}`
    : fmt(remaining);

  return (
    <Pressable
      onPress={stop}
      className={`mx-5 mt-1 flex-row items-center justify-between rounded-full px-4 py-2.5 ${
        done ? 'bg-brand-500' : 'bg-zinc-100 dark:bg-zinc-900'
      }`}>
      <Text
        className={`text-xs uppercase tracking-wide ${
          done ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'
        }`}>
        {done ? "Time's up" : 'Resting'}
      </Text>
      <Text
        className={`font-mono text-lg font-bold ${
          done ? 'text-white' : 'text-zinc-900 dark:text-white'
        }`}>
        {label}
      </Text>
      <Text
        className={`text-xs ${
          done ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'
        }`}>
        Tap to dismiss
      </Text>
    </Pressable>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
