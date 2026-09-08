import { supabase } from '@/lib/supabase';

import type { PersonalRecord } from './types';

export type ProgressPoint = {
  workoutId: string;
  startedAt: string;
  weightKg: number;
  reps: number;
  est1rmKg: number;
};

// Returns one point per workout for the given exercise: the top set by est-1RM.
// Sorted oldest → newest so a chart can render left-to-right.
export async function listExerciseProgress(input: {
  userId: string;
  exerciseId: string;
  sinceIso: string;
}): Promise<ProgressPoint[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, weight_kg, reps, workout:workouts!inner(id, user_id, started_at, ended_at)')
    .eq('exercise_id', input.exerciseId)
    .eq('workout.user_id', input.userId)
    .not('workout.ended_at', 'is', null)
    .gte('workout.started_at', input.sinceIso)
    .not('weight_kg', 'is', null)
    .gt('reps', 0);
  if (error) throw error;

  type Row = {
    workout_id: string;
    weight_kg: number;
    reps: number;
    workout: { id: string; started_at: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const byWorkout = new Map<string, ProgressPoint>();
  for (const r of rows) {
    if (!r.workout) continue;
    const est = round2(r.weight_kg * (1 + r.reps / 30));
    const existing = byWorkout.get(r.workout_id);
    if (!existing || est > existing.est1rmKg) {
      byWorkout.set(r.workout_id, {
        workoutId: r.workout_id,
        startedAt: r.workout.started_at,
        weightKg: r.weight_kg,
        reps: r.reps,
        est1rmKg: est,
      });
    }
  }
  return Array.from(byWorkout.values()).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
}

export async function getPersonalRecord(input: {
  userId: string;
  exerciseId: string;
}): Promise<PersonalRecord | null> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', input.userId)
    .eq('exercise_id', input.exerciseId)
    .maybeSingle();
  if (error) throw error;
  return data as PersonalRecord | null;
}

// Exercises the user has logged at least one weighted set for.
// Used by the progress picker so users don't scroll the whole catalog.
export async function listExercisesWithHistory(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, workout:workouts!inner(user_id)')
    .eq('workout.user_id', userId)
    .not('weight_kg', 'is', null);
  if (error) throw error;
  const seen = new Set<string>();
  for (const r of (data ?? []) as unknown as { exercise_id: string }[]) seen.add(r.exercise_id);
  return Array.from(seen);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
