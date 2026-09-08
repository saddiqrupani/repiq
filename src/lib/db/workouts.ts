import { supabase } from '@/lib/supabase';

import type { Workout, WorkoutSet, WorkoutWithSets } from './types';

export async function getActiveWorkout(userId: string): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as Workout | null;
}

export async function startWorkout(userId: string): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Workout;
}

export async function finishWorkout(
  workoutId: string,
  opts?: { title?: string | null; shareToGymId?: string | null },
): Promise<Workout> {
  const patch: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
    title: opts?.title ?? null,
  };
  if (opts?.shareToGymId) {
    patch.visibility = 'gym';
    patch.shared_gym_id = opts.shareToGymId;
  }
  const { data, error } = await supabase
    .from('workouts')
    .update(patch)
    .eq('id', workoutId)
    .select()
    .single();
  if (error) throw error;
  return data as Workout;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

export async function listSets(workoutId: string): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data as WorkoutSet[];
}

export async function addSet(input: {
  workoutId: string;
  exerciseId: string;
  position: number;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
}): Promise<WorkoutSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id: input.workoutId,
      exercise_id: input.exerciseId,
      position: input.position,
      weight_kg: input.weightKg,
      reps: input.reps,
      rpe: input.rpe,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSet;
}

export async function deleteSet(setId: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', setId);
  if (error) throw error;
}

export async function listRecentWorkouts(userId: string, limit = 20): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Workout[];
}

export async function getWorkoutWithSets(workoutId: string): Promise<WorkoutWithSets | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      *,
      sets:workout_sets (
        *,
        exercise:exercises (id, name, equipment)
      )
    `,
    )
    .eq('id', workoutId)
    .order('position', { referencedTable: 'workout_sets', ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data as WorkoutWithSets | null;
}
