import { Text, View } from 'react-native';

import type { ProgressPoint } from '@/lib/db/progress';
import { kgToLb } from '@/lib/units';

type Props = {
  points: ProgressPoint[];
  height?: number;
};

// Pure-View bar chart. Each bar = the top set of one workout by est-1RM.
// Height is normalized to the max value in the window; hovering isn't a thing
// on RN so date + value labels live below the axis for the first/mid/last bars.
export function ProgressChart({ points, height = 180 }: Props) {
  if (points.length === 0) {
    return (
      <View className="items-center justify-center rounded-3xl border border-dashed border-zinc-300 py-10 dark:border-zinc-800">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          No sets logged in this window.
        </Text>
      </View>
    );
  }

  const max = Math.max(...points.map((p) => p.est1rmKg));
  const min = Math.min(...points.map((p) => p.est1rmKg));
  const range = Math.max(max - min, 1);

  return (
    <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Est. 1RM (lb)
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {kgToLb(min)} – {kgToLb(max)}
        </Text>
      </View>

      <View className="mt-3 flex-row items-end gap-1" style={{ height }}>
        {points.map((p) => {
          // Bars scaled between 20% and 100% of chart height so tiny variation still shows.
          const norm = (p.est1rmKg - min) / range;
          const barH = 0.2 * height + 0.8 * height * norm;
          return (
            <View
              key={p.workoutId}
              className="flex-1 rounded-t-md bg-brand-500"
              style={{ height: barH, minWidth: 4 }}
            />
          );
        })}
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="text-[10px] text-zinc-400">{shortDate(points[0].startedAt)}</Text>
        {points.length > 2 ? (
          <Text className="text-[10px] text-zinc-400">
            {shortDate(points[Math.floor(points.length / 2)].startedAt)}
          </Text>
        ) : null}
        <Text className="text-[10px] text-zinc-400">
          {shortDate(points[points.length - 1].startedAt)}
        </Text>
      </View>
    </View>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
