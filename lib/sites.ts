import { supabase } from './supabase';
import type { Site } from './types';

export async function fetchSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Site[];
}

export async function createSite(input: {
  name: string;
  type: string;
  density: number;
  lat?: number | null;
  lng?: number | null;
  note?: string | null;
}): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data as Site;
}

export async function deleteSite(id: string): Promise<void> {
  const { error } = await supabase.from('sites').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSite(id: string, patch: Partial<Site>): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Site;
}