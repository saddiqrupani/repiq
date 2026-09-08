import { supabase } from '@/lib/supabase';

import type { Exercise } from './types';

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, category, primary_muscle, equipment, created_by, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Exercise[];
}
