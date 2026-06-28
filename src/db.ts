import { supabase } from './supabase'

export interface FeedbackEvent {
  id: string
  slug: string
  title: string
  description?: string
  imageUrl?: string
  eventDate?: string
  isActive: boolean
  createdAt: string
}

export interface FeedbackResponse {
  id: string
  eventId: string
  attendeeName?: string
  attendeeEmail?: string
  rating: number
  enjoyed?: string
  improve?: string
  anythingElse?: string
  allowContact: boolean
  createdAt: string
}

interface FeedbackEventRow {
  id: string
  slug: string
  title: string
  description: string | null
  image_url: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
}

interface FeedbackResponseRow {
  id: string
  event_id: string
  attendee_name: string | null
  attendee_email: string | null
  rating: number
  enjoyed: string | null
  improve: string | null
  anything_else: string | null
  allow_contact: boolean
  created_at: string
}

export interface CreateFeedbackEventInput {
  slug: string
  title: string
  description?: string
  imageUrl?: string
  eventDate?: string
}

export interface SubmitFeedbackInput {
  eventId: string
  attendeeName?: string
  attendeeEmail?: string
  rating: number
  enjoyed?: string
  improve?: string
  anythingElse?: string
  allowContact: boolean
}

const EVENT_COLS = 'id,slug,title,description,image_url,event_date,is_active,created_at'
const RESPONSE_COLS =
  'id,event_id,attendee_name,attendee_email,rating,enjoyed,improve,anything_else,allow_contact,created_at'

function rowToEvent(row: FeedbackEventRow): FeedbackEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    eventDate: row.event_date ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

function rowToResponse(row: FeedbackResponseRow): FeedbackResponse {
  return {
    id: row.id,
    eventId: row.event_id,
    attendeeName: row.attendee_name ?? undefined,
    attendeeEmail: row.attendee_email ?? undefined,
    rating: row.rating,
    enjoyed: row.enjoyed ?? undefined,
    improve: row.improve ?? undefined,
    anythingElse: row.anything_else ?? undefined,
    allowContact: row.allow_contact,
    createdAt: row.created_at,
  }
}

export type FeedbackEventResult =
  | { ok: true; event: FeedbackEvent }
  | { ok: false; reason: 'auth' | 'backend' | 'taken' }

export async function listMyEvents(ownerId: string): Promise<FeedbackEvent[]> {
  if (!supabase || !ownerId) return []

  const { data, error } = await supabase
    .from('feedback_events')
    .select(EVENT_COLS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as FeedbackEventRow[]).map(rowToEvent)
}

export async function getFeedbackEventBySlug(slug: string): Promise<FeedbackEvent | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('feedback_events')
    .select(EVENT_COLS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return rowToEvent(data as FeedbackEventRow)
}

export async function isEventSlugAvailable(slug: string): Promise<boolean> {
  if (!supabase) return false

  const { data, error } = await supabase
    .from('feedback_events')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error) return false
  return data === null
}

export async function createFeedbackEvent(
  input: CreateFeedbackEventInput,
  ownerId: string,
): Promise<FeedbackEventResult> {
  if (!supabase) return { ok: false, reason: 'backend' }
  if (!ownerId) return { ok: false, reason: 'auth' }

  const { data, error } = await supabase
    .from('feedback_events')
    .insert({
      owner_id: ownerId,
      slug: input.slug,
      title: input.title,
      description: input.description || null,
      image_url: input.imageUrl || null,
      event_date: input.eventDate || null,
    })
    .select(EVENT_COLS)
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'taken' }
    return { ok: false, reason: 'backend' }
  }

  return { ok: true, event: rowToEvent(data as FeedbackEventRow) }
}

export async function setFeedbackEventActive(id: string, isActive: boolean): Promise<boolean> {
  if (!supabase || !id) return false

  const { error } = await supabase
    .from('feedback_events')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  return !error
}

export async function updateFeedbackEventImage(
  id: string,
  imageUrl: string | null,
): Promise<boolean> {
  if (!supabase || !id) return false

  const { error } = await supabase
    .from('feedback_events')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  return !error
}

export async function uploadEventImage(file: File, ownerId: string): Promise<string | null> {
  if (!supabase || !ownerId) return null

  const ext = (file.name.split('.').pop() || 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5) || 'jpg'
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, file, { contentType: file.type || 'image/jpeg', cacheControl: '86400' })

  if (error) return null
  return supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl
}

export async function getFeedbackResponses(eventId: string): Promise<FeedbackResponse[]> {
  if (!supabase || !eventId) return []

  const { data, error } = await supabase
    .from('feedback_responses')
    .select(RESPONSE_COLS)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as FeedbackResponseRow[]).map(rowToResponse)
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase.from('feedback_responses').insert({
    event_id: input.eventId,
    attendee_name: input.attendeeName || null,
    attendee_email: input.attendeeEmail || null,
    rating: input.rating,
    enjoyed: input.enjoyed || null,
    improve: input.improve || null,
    anything_else: input.anythingElse || null,
    allow_contact: input.allowContact,
  })

  return !error
}
