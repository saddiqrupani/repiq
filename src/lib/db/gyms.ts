import { supabase } from '@/lib/supabase';

import type { Gym, GymMember } from './types';

export async function searchGyms(query: string, limit = 30): Promise<Gym[]> {
  const q = query.trim();
  let builder = supabase.from('gyms').select('*').order('name').limit(limit);
  if (q) builder = builder.ilike('name', `%${q}%`);
  const { data, error } = await builder;
  if (error) throw error;
  return data as Gym[];
}

export async function getGym(gymId: string): Promise<Gym | null> {
  const { data, error } = await supabase.from('gyms').select('*').eq('id', gymId).maybeSingle();
  if (error) throw error;
  return data as Gym | null;
}

export async function createGym(input: {
  name: string;
  city: string | null;
  createdBy: string;
}): Promise<Gym> {
  const { data, error } = await supabase
    .from('gyms')
    .insert({ name: input.name.trim(), city: input.city?.trim() || null, created_by: input.createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as Gym;
}

export async function listGymMembers(gymId: string, limit = 50): Promise<
  Array<GymMember & { profile: { id: string; username: string; display_name: string | null } }>
> {
  const { data, error } = await supabase
    .from('gym_members')
    .select('*, profile:profiles!inner(id, username, display_name)')
    .eq('gym_id', gymId)
    .order('joined_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as never;
}

export async function joinGym(gymId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gym_members')
    .insert({ gym_id: gymId, user_id: userId });
  // 23505 = unique_violation → already a member, safe to ignore.
  if (error && error.code !== '23505') throw error;
}

export async function leaveGym(gymId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gym_members')
    .delete()
    .eq('gym_id', gymId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listMyGyms(userId: string): Promise<Gym[]> {
  const { data, error } = await supabase
    .from('gym_members')
    .select('gym:gyms(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data as unknown as Array<{ gym: Gym }>).map((r) => r.gym);
}
