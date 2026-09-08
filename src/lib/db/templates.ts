import { supabase } from '@/lib/supabase';

import type {
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from './types';

export async function listMyTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WorkoutTemplate[];
}

export async function getTemplate(id: string): Promise<WorkoutTemplateWithExercises | null> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      *,
      exercises:workout_template_exercises (
        *,
        exercise:exercises (id, name, equipment)
      )
    `,
    )
    .eq('id', id)
    .order('position', { referencedTable: 'workout_template_exercises', ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data as WorkoutTemplateWithExercises | null;
}

// Creates a template snapshot from the exercises used in an existing workout.
// Order = the order sets appeared in the workout. Duplicates are collapsed.
export async function createTemplateFromWorkout(input: {
  userId: string;
  workoutId: string;
  name: string;
}): Promise<WorkoutTemplate> {
  const { data: sets, error: setsErr } = await supabase
    .from('workout_sets')
    .select('exercise_id, position, reps')
    .eq('workout_id', input.workoutId)
    .order('position', { ascending: true });
  if (setsErr) throw setsErr;
  if (!sets || sets.length === 0) throw new Error('Workout has no sets to snapshot.');

  const seen = new Map<string, { position: number; reps: number[] }>();
  for (const s of sets as { exercise_id: string; position: number; reps: number }[]) {
    const cur = seen.get(s.exercise_id);
    if (cur) cur.reps.push(s.reps);
    else seen.set(s.exercise_id, { position: seen.size + 1, reps: [s.reps] });
  }

  const { data: tpl, error: tplErr } = await supabase
    .from('workout_templates')
    .insert({ user_id: input.userId, name: input.name })
    .select()
    .single();
  if (tplErr) throw tplErr;

  const rows = Array.from(seen.entries()).map(([exerciseId, meta]) => ({
    template_id: (tpl as WorkoutTemplate).id,
    exercise_id: exerciseId,
    position: meta.position,
    target_sets: meta.reps.length,
    target_reps: meta.reps.length > 0 ? Math.round(median(meta.reps)) : null,
  }));

  const { error: exErr } = await supabase
    .from('workout_template_exercises')
    .insert(rows);
  if (exErr) throw exErr;

  return tpl as WorkoutTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
