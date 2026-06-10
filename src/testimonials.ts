import { supabase } from './supabase'
import type { Space, Testimonial } from './types'

interface SpaceRow {
  id: string
  slug: string
  name: string
  headline: string | null
  intro: string | null
  color: string | null
  logo_url: string | null
}

interface TestimonialRow {
  id: string
  space_id: string
  author_name: string
  author_role: string | null
  author_avatar_url: string | null
  video_url: string | null
  rating: number
  message: string
  approved: boolean
  created_at: string
}

const SPACE_COLS = 'id,slug,name,headline,intro,color,logo_url'
// Select all columns so reads stay resilient if the media migration (0005)
// hasn't been applied yet (missing columns simply read as undefined).
const T_COLS = '*'

function rowToSpace(r: SpaceRow): Space {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    headline: r.headline ?? undefined,
    intro: r.intro ?? undefined,
    color: r.color ?? undefined,
    logo: r.logo_url ?? undefined,
  }
}

function rowToTestimonial(r: TestimonialRow): Testimonial {
  return {
    id: r.id,
    spaceId: r.space_id,
    authorName: r.author_name,
    authorRole: r.author_role ?? undefined,
    authorAvatar: r.author_avatar_url ?? undefined,
    videoUrl: r.video_url ?? undefined,
    rating: r.rating,
    message: r.message,
    approved: r.approved,
    createdAt: r.created_at,
  }
}

/** All spaces owned by the signed-in user, newest first. */
export async function getMySpaces(ownerId: string): Promise<Space[]> {
  if (!supabase || !ownerId) return []
  const { data, error } = await supabase
    .from('spaces')
    .select(SPACE_COLS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as SpaceRow[]).map(rowToSpace)
}

/** A single space by slug, or null. */
export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('spaces')
    .select(SPACE_COLS)
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return rowToSpace(data as SpaceRow)
}

/** Whether a space slug is free. Fails safe to false on error. */
export async function isSpaceSlugAvailable(slug: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from('spaces').select('slug').eq('slug', slug).maybeSingle()
  if (error) return false
  return data === null
}

export type CreateSpaceInput = Omit<Space, 'id'>

export type SpaceResult =
  | { ok: true; space: Space }
  | { ok: false; reason: 'taken' | 'backend' | 'auth' }

/** Create a new space owned by the signed-in user. */
export async function createSpace(input: CreateSpaceInput, ownerId: string): Promise<SpaceResult> {
  if (!supabase) return { ok: false, reason: 'backend' }
  if (!ownerId) return { ok: false, reason: 'auth' }
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      slug: input.slug,
      name: input.name,
      headline: input.headline || null,
      intro: input.intro || null,
      color: input.color || null,
      logo_url: input.logo || null,
      owner_id: ownerId,
    })
    .select(SPACE_COLS)
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'taken' }
    return { ok: false, reason: 'backend' }
  }
  return { ok: true, space: rowToSpace(data as SpaceRow) }
}

/** Update a space's editable fields (owner only, slug is immutable). */
export async function updateSpace(
  id: string,
  patch: { logo?: string | null },
): Promise<boolean> {
  if (!supabase) return false
  const row: Record<string, string | null> = {}
  if ('logo' in patch) row.logo_url = patch.logo ?? null
  const { error } = await supabase.from('spaces').update(row).eq('id', id)
  return !error
}

/** Delete a space (and its testimonials, via cascade). */
export async function deleteSpace(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('spaces').delete().eq('id', id)
  return !error
}

/** Upload testimonial media (author photo or video) to the public bucket. */
export async function uploadTestimonialMedia(
  file: File,
  spaceId: string,
  kind: 'photo' | 'video',
): Promise<string | null> {
  if (!supabase || !spaceId) return null
  const ext = (file.name.split('.').pop() || (kind === 'video' ? 'webm' : 'jpg'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5) || (kind === 'video' ? 'webm' : 'jpg')
  const path = `${spaceId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('testimonials')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' })
  if (error) return null
  return supabase.storage.from('testimonials').getPublicUrl(path).data.publicUrl
}

/** Upload a space logo to the owner's folder in the avatars bucket. */
export async function uploadSpaceLogo(file: File, ownerId: string): Promise<string | null> {
  if (!supabase || !ownerId) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${ownerId}/logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg', cacheControl: '3600' })
  if (error) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

/** Approved testimonials for a space (public). */
export async function getApprovedTestimonials(spaceId: string): Promise<Testimonial[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('testimonials')
    .select(T_COLS)
    .eq('space_id', spaceId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as TestimonialRow[]).map(rowToTestimonial)
}

/** All testimonials for a space the caller owns (pending + approved). */
export async function getAllTestimonials(spaceId: string): Promise<Testimonial[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('testimonials')
    .select(T_COLS)
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as TestimonialRow[]).map(rowToTestimonial)
}

export interface SubmitTestimonialInput {
  spaceId: string
  authorName: string
  authorRole?: string
  authorAvatar?: string
  videoUrl?: string
  rating: number
  message: string
}

/** Submit a testimonial (lands as pending). Returns true on success. */
export async function submitTestimonial(input: SubmitTestimonialInput): Promise<boolean> {
  if (!supabase) return false
  // Only include media columns when present so text-only submissions keep
  // working even if the media migration (0005) hasn't been applied yet.
  const row: Record<string, string | number | boolean | null> = {
    space_id: input.spaceId,
    author_name: input.authorName,
    author_role: input.authorRole || null,
    rating: input.rating,
    message: input.message,
    approved: false,
  }
  if (input.authorAvatar) row.author_avatar_url = input.authorAvatar
  if (input.videoUrl) row.video_url = input.videoUrl
  const { error } = await supabase.from('testimonials').insert(row)
  return !error
}

export interface ImportTestimonialInput {
  spaceId: string
  authorName: string
  authorRole?: string
  rating: number
  message: string
}

/** Owner-side: insert one or more testimonials pre-approved (import). */
export async function importTestimonials(rows: ImportTestimonialInput[]): Promise<number> {
  if (!supabase || rows.length === 0) return 0
  const payload = rows.map((r) => ({
    space_id: r.spaceId,
    author_name: r.authorName,
    author_role: r.authorRole || null,
    rating: r.rating,
    message: r.message,
    approved: true,
  }))
  const { data, error } = await supabase.from('testimonials').insert(payload).select('id')
  if (error || !data) return 0
  return data.length
}

/** Approve or un-approve a testimonial (owner only). */
export async function setTestimonialApproved(id: string, approved: boolean): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('testimonials').update({ approved }).eq('id', id)
  return !error
}

/** Permanently delete a testimonial (owner only). */
export async function deleteTestimonial(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  return !error
}
