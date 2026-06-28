import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when Supabase env vars are present (slug pages require a backend). */
export const supabaseReady: boolean = Boolean(url && publishable)

/** Shared Supabase client, or null when not configured. */
export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url as string, publishable as string)
  : null
