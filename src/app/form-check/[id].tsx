import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuizSheet } from '@/components/QuizSheet';
import { useFormAnalysis, useGenerateQuiz } from '@/hooks/useFormAnalysis';
import { signedVideoUrl } from '@/lib/db/formAnalyses';
import { errorMessage } from '@/lib/errors';

export default function FormAnalysisDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending } = useFormAnalysis(id);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const generateQuiz = useGenerateQuiz();

  function openQuiz() {
    setQuizOpen(true);
    generateQuiz.mutate(id);
  }

  useEffect(() => {
    let cancelled = false;
    if (!data?.annotated_video_path) {
      setVideoUrl(null);
      return;
    }
    signedVideoUrl(data.annotated_video_path).then((url) => {
      if (!cancelled) setVideoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.annotated_video_path]);

  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    p.loop = true;
    p.muted = true;
    if (videoUrl) p.play();
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base font-medium text-brand-500">Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white">Form check</Text>
        <View className="w-12" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, gap: 16 }}
        showsVerticalScrollIndicator
        scrollEnabled
        keyboardShouldPersistTaps="handled">
        {isPending || !data ? (
          <View className="items-center pt-16">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : (
          <>
            <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {data.exercise.name}
              </Text>
              <View className="mt-2 flex-row items-baseline gap-2">
                <Text
                  className={`text-5xl font-black ${
                    data.status === 'complete' ? 'text-brand-500' : 'text-zinc-500'
                  }`}>
                  {data.score !== null ? Math.round(data.score) : '—'}
                </Text>
                <Text className="text-base text-zinc-500 dark:text-zinc-400">/ 100</Text>
              </View>
              <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {data.status === 'failed' ? `Failed: ${data.error ?? 'unknown error'}` : data.status}
              </Text>
            </View>

            {videoUrl ? (
              <View
                pointerEvents="none"
                className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800"
                style={{ height: 480 }}>
                <VideoView
                  player={player}
                  style={{ flex: 1 }}
                  contentFit="cover"
                  nativeControls={false}
                />
              </View>
            ) : null}

            {data.feedback && data.feedback.length > 0 ? (
              <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Coach notes
                </Text>
                {data.feedback.map((f, i) => (
                  <View key={i} className="mt-2 flex-row gap-2">
                    <Text className="text-zinc-500">•</Text>
                    <Text className="flex-1 text-sm text-zinc-800 dark:text-zinc-100">{f}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.status === 'complete' ? (
              <Pressable
                onPress={openQuiz}
                className="flex-row items-center justify-between rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4 active:bg-brand-500/20">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-brand-500">Take the coach quiz</Text>
                  <Text className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    3 quick questions to lock in the corrections.
                  </Text>
                </View>
                <Text className="text-2xl text-brand-500">›</Text>
              </Pressable>
            ) : null}

            {data.metrics ? (
              <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Metrics
                </Text>
                {Object.entries(data.metrics).map(([k, v]) => (
                  <View key={k} className="mt-1 flex-row justify-between">
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{k.replace(/_/g, ' ')}</Text>
                    <Text className="text-sm font-medium text-zinc-900 dark:text-white">{String(v)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <QuizSheet
        visible={quizOpen}
        loading={generateQuiz.isPending}
        error={generateQuiz.error ? errorMessage(generateQuiz.error) : null}
        quiz={generateQuiz.data ?? null}
        onClose={() => setQuizOpen(false)}
        onRegenerate={() => generateQuiz.mutate(id)}
      />
    </SafeAreaView>
  );
}
