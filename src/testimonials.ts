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
  rating: number
  message: string
  approved: boolean
  created_at: string
}

const SPACE_COLS = 'id,slug,name,headline,intro,color,logo_url'
const T_COLS = 'id,space_id,author_name,author_role,rating,message,approved,created_at'

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

/** Delete a space (and its testimonials, via cascade). */
export async function deleteSpace(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('spaces').delete().eq('id', id)
  return !error
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
  rating: number
  message: string
}

/** Submit a testimonial (lands as pending). Returns true on success. */
export async function submitTestimonial(input: SubmitTestimonialInput): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('testimonials').insert({
    space_id: input.spaceId,
    author_name: input.authorName,
    author_role: input.authorRole || null,
    rating: input.rating,
    message: input.message,
    approved: false,
  })
  return !error
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
