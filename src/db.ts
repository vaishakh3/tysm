import { supabase } from './supabase'
import { dedupe } from './lib'
import type { TipProfile } from './types'

export interface Creator extends TipProfile {
  slug: string
}

interface CreatorRow {
  slug: string
  name: string
  upi: string
  bio: string | null
  emoji: string | null
  presets: number[] | null
}

function rowToCreator(row: CreatorRow): Creator {
  return {
    slug: row.slug,
    name: row.name,
    upi: row.upi,
    bio: row.bio ?? undefined,
    emoji: row.emoji ?? undefined,
    presets: row.presets?.length ? row.presets : [49, 99, 199],
  }
}

/** Fetch a creator by slug, or null if not found / backend unavailable. */
export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('creators')
    .select('slug,name,upi,bio,emoji,presets')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return rowToCreator(data as CreatorRow)
}

/** Whether a slug is free. Returns false on any backend error (fail safe). */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase
    .from('creators')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error) return false
  return data === null
}

export type CreateResult =
  | { ok: true; creator: Creator }
  | { ok: false; reason: 'taken' | 'backend' }

/** Insert a new creator page. Returns 'taken' on slug collision. */
export async function createCreator(input: Creator): Promise<CreateResult> {
  if (!supabase) return { ok: false, reason: 'backend' }
  const { data, error } = await supabase
    .from('creators')
    .insert({
      slug: input.slug,
      name: input.name,
      upi: input.upi,
      bio: input.bio || null,
      emoji: input.emoji || null,
      presets: dedupe(input.presets),
    })
    .select('slug,name,upi,bio,emoji,presets')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'taken' }
    return { ok: false, reason: 'backend' }
  }
  return { ok: true, creator: rowToCreator(data as CreatorRow) }
}
