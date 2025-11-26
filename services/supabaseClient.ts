import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  // Use Vite environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    try {
      supabaseInstance = createClient(envUrl, envKey);
      return supabaseInstance;
    } catch (e) {
      console.warn("Failed to initialize Supabase from env vars:", e);
    }
  }

  return null;
};

export const isSupabaseConfigured = (): boolean => {
  return !!getSupabase();
};
