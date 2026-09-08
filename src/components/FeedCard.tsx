import { Pressable, Text, View } from 'react-native';

import type { FeedPost } from '@/lib/db/types';
import { formatDate } from '@/lib/format';
import { kgToLb } from '@/lib/units';

function summarize(sets: FeedPost['sets']) {
  const byEx = new Map<string, { name: string; equipment: string; sets: FeedPost['sets'] }>();
  for (const s of sets) {
    const existing = byEx.get(s.exercise_id);
    if (existing) existing.sets.push(s);
    else
      byEx.set(s.exercise_id, {
        name: s.exercise.name,
        equipment: s.exercise.equipment,
        sets: [s],
      });
  }
  return Array.from(byEx.values());
}

type Props = {
  post: FeedPost;
  onOpen: () => void;
  onReact: (nextOn: boolean) => void;
  reactPending?: boolean;
};

export function FeedCard({ post, onOpen, onReact, reactPending }: Props) {
  const groups = summarize(post.sets);
  const author = post.author.display_name || post.author.username;
  const prCount = post.sets.filter((s) => s.is_pr).length;

  return (
    <Pressable
      onPress={onOpen}
      className="rounded-3xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-500/20">
            <Text className="font-semibold text-brand-500">
              {(author[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">
              {author}
            </Text>
            <Text numberOfLines={1} className="text-xs text-zinc-500 dark:text-zinc-400">
              {post.gym?.name ?? 'Shared workout'} · {formatDate(post.started_at)}
            </Text>
          </View>
        </View>
      </View>

      {post.title ? (
        <Text className="mt-3 text-base font-medium text-zinc-900 dark:text-white">
          {post.title}
        </Text>
      ) : null}

      {prCount > 0 ? (
        <View className="mt-3 self-start rounded-full bg-brand-500/15 px-3 py-1">
          <Text className="text-xs font-bold text-brand-500">
            {prCount === 1 ? 'New PR' : `${prCount} new PRs`}
          </Text>
        </View>
      ) : null}

      <View className="mt-3 gap-1">
        {groups.slice(0, 4).map((g) => {
          const top = g.sets.reduce<{ weight_kg: number | null; reps: number } | null>(
            (best, s) => {
              if (!best) return { weight_kg: s.weight_kg, reps: s.reps };
              const bestScore = (best.weight_kg ?? 0) * best.reps;
              const cur = (s.weight_kg ?? 0) * s.reps;
              return cur > bestScore ? { weight_kg: s.weight_kg, reps: s.reps } : best;
            },
            null,
          );
          const setsLabel = `${g.sets.length}×`;
          const topLabel =
            g.equipment === 'bodyweight'
              ? `${top?.reps ?? 0} reps`
              : top?.weight_kg != null
                ? `${kgToLb(top.weight_kg)} lb × ${top.reps}`
                : `${top?.reps ?? 0} reps`;
          return (
            <View key={g.name} className="flex-row justify-between">
              <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">
                {setsLabel} {g.name}
              </Text>
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">{topLabel}</Text>
            </View>
          );
        })}
        {groups.length > 4 ? (
          <Text className="text-xs text-zinc-400">+{groups.length - 4} more</Text>
        ) : null}
      </View>

      <View className="mt-4 flex-row items-center gap-4">
        <Pressable
          onPress={() => onReact(!post.reactions.mine)}
          disabled={reactPending}
          hitSlop={8}
          className="flex-row items-center gap-1.5">
          <Text className={post.reactions.mine ? 'text-orange-500' : 'text-zinc-400'}>
            {post.reactions.mine ? 'FIRE' : 'fire'}
          </Text>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">
            {post.reactions.count}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-zinc-400">·</Text>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">
            {post.comments.count} {post.comments.count === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
