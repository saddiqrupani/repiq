import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/hooks/useSession';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  usePost,
  useToggleReaction,
} from '@/hooks/useSocial';
import { formatDate, formatDuration } from '@/lib/format';
import { kgToLb } from '@/lib/units';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session?.user.id;
  const post = usePost(id);
  const comments = useComments(id);
  const react = useToggleReaction(id!);
  const addComment = useAddComment(id!);
  const deleteComment = useDeleteComment(id!);
  const [draft, setDraft] = useState('');

  const grouped = useMemo(() => {
    if (!post.data) return [];
    const m = new Map<string, { name: string; equipment: string; sets: typeof post.data.sets }>();
    for (const s of post.data.sets) {
      const existing = m.get(s.exercise_id);
      if (existing) existing.sets.push(s);
      else
        m.set(s.exercise_id, {
          name: s.exercise.name,
          equipment: s.exercise.equipment,
          sets: [s],
        });
    }
    return Array.from(m.values());
  }, [post.data]);

  async function submitComment() {
    const body = draft.trim();
    if (!body) return;
    try {
      await addComment.mutateAsync(body);
      setDraft('');
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Post</Text>
        <View className="w-12" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}>
        <ScrollView contentContainerClassName="px-5 pb-20 gap-4">
          {post.isPending ? (
            <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
          ) : post.isError ? (
            <Text className="text-red-500">Error: {String(post.error)}</Text>
          ) : !post.data ? (
            <Text className="text-zinc-500 dark:text-zinc-400">Not found.</Text>
          ) : (
            <>
              <Pressable
                onPress={() =>
                  post.data && router.push(`/user/${post.data.author.id}`)
                }
                className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-500/20">
                  <Text className="font-semibold text-brand-500">
                    {(
                      post.data.author.display_name ?? post.data.author.username
                    )[0]?.toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                    {post.data.author.display_name ?? post.data.author.username}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    @{post.data.author.username} · {post.data.gym?.name ?? 'Shared'}
                  </Text>
                </View>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(post.data.started_at)}
                </Text>
              </Pressable>

              {post.data.title ? (
                <Text className="text-xl font-bold text-zinc-900 dark:text-white">
                  {post.data.title}
                </Text>
              ) : null}

              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatDuration(post.data.started_at, post.data.ended_at)}
              </Text>

              {grouped.map((g, i) => (
                <View
                  key={i}
                  className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                    {g.name}
                  </Text>
                  <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {g.equipment}
                  </Text>
                  <View className="mt-2 gap-1">
                    {g.sets.map((s, idx) => (
                      <View
                        key={s.id}
                        className="flex-row items-center rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                        <Text className="w-8 text-sm font-semibold text-zinc-900 dark:text-white">
                          {idx + 1}
                        </Text>
                        <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">
                          {g.equipment === 'bodyweight'
                            ? 'Bodyweight'
                            : s.weight_kg != null
                              ? `${kgToLb(s.weight_kg)} lb`
                              : '—'}
                        </Text>
                        <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                          {s.reps} reps
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View className="flex-row items-center gap-4">
                <Pressable
                  onPress={() => react.mutate(!post.data!.reactions.mine)}
                  disabled={react.isPending}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    post.data.reactions.mine
                      ? 'bg-orange-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                  <Text
                    className={
                      post.data.reactions.mine ? 'text-orange-500' : 'text-zinc-500'
                    }>
                    fire
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                    {post.data.reactions.count}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-2 gap-3">
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  Comments
                </Text>
                {comments.isPending ? (
                  <Text className="text-zinc-500 dark:text-zinc-400">Loading…</Text>
                ) : (comments.data ?? []).length === 0 ? (
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    Be the first to comment.
                  </Text>
                ) : (
                  (comments.data ?? []).map((c) => (
                    <View
                      key={c.id}
                      className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {c.author.display_name ?? c.author.username}
                        </Text>
                        {c.user_id === uid ? (
                          <Pressable onPress={() => deleteComment.mutate(c.id)} hitSlop={8}>
                            <Text className="text-xs text-zinc-400">delete</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Text className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                        {c.body}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>

        {post.data ? (
          <View className="flex-row items-center gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment…"
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              maxLength={500}
            />
            <Pressable
              onPress={submitComment}
              disabled={addComment.isPending || !draft.trim()}
              className={`rounded-full bg-brand-500 px-4 py-2.5 ${
                addComment.isPending || !draft.trim() ? 'opacity-60' : ''
              }`}>
              <Text className="text-sm font-semibold text-white">Post</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
