import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when Supabase env vars are present (slug pages require a backend). */
export const supabaseReady: boolean = Boolean(url && anon)

/** Shared Supabase client, or null when not configured. */
export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url as string, anon as string)
  : null
