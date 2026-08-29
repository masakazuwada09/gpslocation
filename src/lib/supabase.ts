/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocationRecord } from '../types';

// Retrieve config from Vite / Next environment variables or localStorage overrides
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const metaEnv = (import.meta as any).env || {};
  const envUrl =
    (metaEnv.VITE_SUPABASE_URL as string | undefined) ||
    (metaEnv.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    '';

  const envKey =
    (metaEnv.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    '';

  // Check localStorage for quick testing if env is not set
  let localUrl = '';
  let localKey = '';
  try {
    localUrl = localStorage.getItem('supabase_custom_url') || '';
    localKey = localStorage.getItem('supabase_custom_key') || '';
  } catch {
    // ignore
  }

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return (
    url.length > 0 &&
    anonKey.length > 0 &&
    !url.includes('your-project') &&
    !anonKey.includes('your-anon')
  );
}

let supabaseInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || url.includes('your-project') || anonKey.includes('your-anon')) {
    return null;
  }

  if (!supabaseInstance || lastUsedUrl !== url || lastUsedKey !== anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      lastUsedUrl = url;
      lastUsedKey = anonKey;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export async function insertLocation(lat: number, lng: number): Promise<{ success: boolean; error?: string; data?: LocationRecord }> {
  const client = getSupabaseClient();
  if (!client) {
    // If not configured, throw a clear actionable error or save locally for demo
    return {
      success: false,
      error: 'Supabase URL and Anon Key are not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or Settings.',
    };
  }

  try {
    const { error } = await client
      .from('locations')
      .insert([
        {
          lat,
          lng,
        },
      ]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { lat, lng } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to insert location into Supabase' };
  }
}
