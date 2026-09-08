import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import type { QuizResponse } from '@/hooks/useFormAnalysis';

type Props = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  quiz: QuizResponse | null;
  onClose: () => void;
  onRegenerate: () => void;
};

export function QuizSheet({ visible, loading, error, quiz, onClose, onRegenerate }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50" />
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white dark:bg-zinc-900"
        style={{ maxHeight: '90%' }}>
        <View className="items-center pt-3">
          <View className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}>
          <View>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Coach quiz</Text>
            {quiz ? (
              <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Reinforcing corrections from your {quiz.exercise} analysis.
              </Text>
            ) : null}
          </View>

          {loading ? (
            <Text className="py-8 text-center text-zinc-500 dark:text-zinc-400">
              Generating quiz…
            </Text>
          ) : error ? (
            <View className="rounded-2xl bg-red-500/10 p-4">
              <Text className="text-sm text-red-500">{error}</Text>
            </View>
          ) : quiz ? (
            <QuizBody quiz={quiz} />
          ) : null}

          <View className="gap-2">
            <Button
              label="Regenerate quiz"
              variant="secondary"
              onPress={onRegenerate}
              disabled={loading}
            />
            <Button label="Close" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function QuizBody({ quiz }: { quiz: QuizResponse }) {
  // Selection state resets whenever a new quiz payload comes in.
  const [selections, setSelections] = useState<Record<number, number>>({});

  return (
    <View className="gap-4">
      {quiz.questions.map((q, qi) => {
        const picked = selections[qi];
        const showResult = picked !== undefined;
        const correct = showResult && picked === q.correct_index;
        return (
          <View
            key={qi}
            className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <Text className="text-xs uppercase tracking-wide text-brand-500">
              Question {qi + 1} of {quiz.questions.length}
            </Text>
            <Text className="mt-1 text-base font-semibold text-zinc-900 dark:text-white">
              {q.prompt}
            </Text>

            <View className="mt-3 gap-2">
              {q.choices.map((c, ci) => {
                const isPicked = picked === ci;
                const isRightAnswer = ci === q.correct_index;
                let cls = 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900';
                if (showResult) {
                  if (isRightAnswer) cls = 'border-green-500 bg-green-500/10';
                  else if (isPicked) cls = 'border-red-500 bg-red-500/10';
                }
                return (
                  <Pressable
                    key={ci}
                    disabled={showResult}
                    onPress={() => setSelections((s) => ({ ...s, [qi]: ci }))}
                    className={`rounded-2xl border p-3 ${cls}`}>
                    <Text className="text-sm text-zinc-900 dark:text-white">{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            {showResult ? (
              <View className="mt-3 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
                <Text
                  className={`text-xs font-semibold ${
                    correct ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  }`}>
                  {correct ? 'Correct' : 'Not quite'}
                </Text>
                <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                  {q.explanation}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
