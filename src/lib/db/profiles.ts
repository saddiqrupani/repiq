import { supabase } from '@/lib/supabase';

import type { Profile } from './types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function setHomeGym(userId: string, gymId: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ home_gym_id: gymId })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// Guarantees a row exists in public.profiles for the current auth user.
// Needed after a local `supabase db reset` or any case where the auth user
// exists but the handle_new_user trigger never fired for them (e.g. the user
// signed up before the trigger was added).
export async function ensureProfile(input: {
  userId: string;
  email: string | null | undefined;
}): Promise<Profile> {
  const existing = await getProfile(input.userId);
  if (existing) return existing;
  const usernameBase = (input.email ?? '').split('@')[0] || `user_${input.userId.slice(0, 8)}`;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: input.userId, username: usernameBase, display_name: usernameBase })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
