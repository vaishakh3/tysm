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

const COLS = 'slug,name,upi,bio,emoji,presets'

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
    .select(COLS)
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return rowToCreator(data as CreatorRow)
}

/** Fetch the page owned by the signed-in user, or null if they have none. */
export async function getMyCreator(ownerId: string): Promise<Creator | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('creators')
    .select(COLS)
    .eq('owner_id', ownerId)
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
  | { ok: false; reason: 'taken' | 'backend' | 'auth' }

/** Insert a new creator page owned by the signed-in user. */
export async function createCreator(input: Creator, ownerId: string): Promise<CreateResult> {
  if (!supabase) return { ok: false, reason: 'backend' }
  if (!ownerId) return { ok: false, reason: 'auth' }
  const { data, error } = await supabase
    .from('creators')
    .insert({
      slug: input.slug,
      name: input.name,
      upi: input.upi,
      bio: input.bio || null,
      emoji: input.emoji || null,
      presets: dedupe(input.presets),
      owner_id: ownerId,
    })
    .select(COLS)
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'taken' }
    return { ok: false, reason: 'backend' }
  }
  return { ok: true, creator: rowToCreator(data as CreatorRow) }
}

export type UpdateResult =
  | { ok: true; creator: Creator }
  | { ok: false; reason: 'backend' | 'auth' }

/** Update the signed-in user's page (slug is immutable). */
export async function updateCreator(input: Creator, ownerId: string): Promise<UpdateResult> {
  if (!supabase) return { ok: false, reason: 'backend' }
  if (!ownerId) return { ok: false, reason: 'auth' }
  const { data, error } = await supabase
    .from('creators')
    .update({
      name: input.name,
      upi: input.upi,
      bio: input.bio || null,
      emoji: input.emoji || null,
      presets: dedupe(input.presets),
    })
    .eq('owner_id', ownerId)
    .select(COLS)
    .single()
  if (error || !data) return { ok: false, reason: 'backend' }
  return { ok: true, creator: rowToCreator(data as CreatorRow) }
}
