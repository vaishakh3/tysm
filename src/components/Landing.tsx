import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { signInWithGoogle, useAuth } from '../auth'
import {
  createFeedbackEvent,
  getFeedbackResponses,
  isEventSlugAvailable,
  listMyEvents,
  setFeedbackEventActive,
  updateFeedbackEventImage,
  uploadEventImage,
  type FeedbackEvent,
  type FeedbackResponse,
} from '../db'
import {
  averageRating,
  buildEventUrl,
  formatEventDate,
  formatSubmittedAt,
  isValidSlug,
  slugify,
} from '../lib'
import { navigate } from '../router'
import { supabaseReady } from '../supabase'
import { AccountNav } from './AccountNav'
import { Brand } from './Brand'
import { Qr } from './Qr'
import { Stars } from './Stars'
import { celebrate } from '../confetti'

type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

export function Landing() {
  const { user, loading: authLoading } = useAuth()
  const [eventsState, setEventsState] = useState<{ ownerId: string; items: FeedbackEvent[] } | null>(
    null,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [responsesState, setResponsesState] = useState<{
    eventId: string
    items: FeedbackResponse[]
  } | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [detailImageUploading, setDetailImageUploading] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [avail, setAvail] = useState<{ slug: string; free: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const slugEdited = useRef(false)
  const events = user && eventsState?.ownerId === user.id ? eventsState.items : []
  const eventsLoading = Boolean(user && eventsState?.ownerId !== user.id)
  const selectedEvent = events.find((event) => event.id === selectedId) ?? events[0] ?? null
  const responses = useMemo(
    () => (selectedEvent && responsesState?.eventId === selectedEvent.id ? responsesState.items : []),
    [responsesState, selectedEvent],
  )
  const responsesLoading = Boolean(selectedEvent && responsesState?.eventId !== selectedEvent.id)

  useEffect(() => {
    if (!user) return

    let active = true
    listMyEvents(user.id).then((items) => {
      if (!active) return
      setEventsState({ ownerId: user.id, items })
      setSelectedId((current) =>
        current && items.some((event) => event.id === current) ? current : (items[0]?.id ?? null),
      )
    })

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!selectedEvent) return

    let active = true
    getFeedbackResponses(selectedEvent.id).then((items) => {
      if (!active) return
      setResponsesState({ eventId: selectedEvent.id, items })
    })

    return () => {
      active = false
    }
  }, [selectedEvent])

  useEffect(() => {
    if (!slugEdited.current) setSlug(slugify(title))
  }, [title])

  const slugValid = slug.length > 0 && isValidSlug(slug)

  useEffect(() => {
    if (!slugValid) return

    let active = true
    const id = window.setTimeout(async () => {
      const free = await isEventSlugAvailable(slug)
      if (active) setAvail({ slug, free })
    }, 350)

    return () => {
      active = false
      window.clearTimeout(id)
    }
  }, [slug, slugValid])

  const resolved = avail && avail.slug === slug
  const slugStatus: SlugStatus = !slug
    ? 'idle'
    : !slugValid
      ? 'invalid'
      : resolved
        ? avail.free
          ? 'available'
          : 'taken'
        : 'checking'

  const ready = title.trim().length > 0 && slugStatus === 'available' && !imageUploading
  const eventUrl = selectedEvent ? buildEventUrl(selectedEvent.slug) : ''
  const responseAverage = useMemo(
    () => averageRating(responses.map((response) => response.rating)),
    [responses],
  )

  const onSlugChange = (value: string) => {
    slugEdited.current = true
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .slice(0, 60),
    )
  }

  const uploadImage = async (file: File | undefined, mode: 'create' | 'detail') => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 7 * 1024 * 1024) {
      setError('Please keep the event image under 7 MB.')
      return
    }

    setError(null)
    if (mode === 'create') setImageUploading(true)
    else setDetailImageUploading(true)

    const uploadedUrl = await uploadEventImage(file, user.id)

    if (mode === 'create') setImageUploading(false)
    else setDetailImageUploading(false)

    if (!uploadedUrl) {
      setError('Could not upload that image. Please try again.')
      return
    }

    if (mode === 'create') {
      setImageUrl(uploadedUrl)
      return
    }

    if (!selectedEvent) return
    const ok = await updateFeedbackEventImage(selectedEvent.id, uploadedUrl)
    if (!ok) {
      setError('Image uploaded, but could not attach it to the event.')
      return
    }

    setEventsState((current) => {
      if (!current || current.ownerId !== user.id) return current
      return {
        ...current,
        items: current.items.map((event) =>
          event.id === selectedEvent.id ? { ...event, imageUrl: uploadedUrl } : event,
        ),
      }
    })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || saving || !user) return

    setSaving(true)
    setError(null)
    const result = await createFeedbackEvent(
      {
        title: title.trim(),
        slug,
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        eventDate: eventDate || undefined,
      },
      user.id,
    )
    setSaving(false)

    if (result.ok) {
      setEventsState((current) => ({
        ownerId: user.id,
        items:
          current?.ownerId === user.id ? [result.event, ...current.items] : [result.event],
      }))
      setSelectedId(result.event.id)
      setTitle('')
      setSlug('')
      setDescription('')
      setImageUrl(null)
      setEventDate('')
      setAvail(null)
      slugEdited.current = false
      celebrate()
      return
    }

    if (result.reason === 'taken') {
      setAvail({ slug, free: false })
      return
    }

    setError('Could not create that event. Please try again.')
  }

  const copySelectedLink = async () => {
    if (!eventUrl) return
    await navigator.clipboard.writeText(eventUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const toggleActive = async () => {
    if (!selectedEvent) return

    const next = !selectedEvent.isActive
    const ok = await setFeedbackEventActive(selectedEvent.id, next)
    if (!ok) {
      setError('Could not update the event status.')
      return
    }

    setEventsState((current) => {
      if (!current || current.ownerId !== user?.id) return current
      return {
        ...current,
        items: current.items.map((event) =>
          event.id === selectedEvent.id ? { ...event, isActive: next } : event,
        ),
      }
    })
  }

  if (!supabaseReady) {
    return (
      <Shell>
        <div className="empty-state rise rise-1">
          <span className="kicker">Setup needed</span>
          <h1 className="form-title">Connect Supabase to start collecting feedback.</h1>
          <p className="form-sub">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY after applying the feedback
            migration.
          </p>
        </div>
      </Shell>
    )
  }

  if (authLoading) {
    return (
      <Shell>
        <p className="form-sub rise rise-1">Loading...</p>
      </Shell>
    )
  }

  if (!user) {
    return (
      <Shell landing>
        <main className="hero admin-hero landing-hero">
          <section className="landing-copy">
            <span className="kicker rise rise-1">Event feedback links</span>
            <h1 className="rise rise-2">
              Send a TYSM link after every <span className="thanks">gathering.</span>
            </h1>
            <p className="sub rise rise-3">
              Create event-specific forms like tysm.in/event/design-workshop and collect attendee
              feedback directly in Supabase.
            </p>
            <button className="btn btn-primary btn-lg rise rise-3" onClick={() => signInWithGoogle('/')}>
              Continue with Google
            </button>
          </section>

          <aside className="landing-art rise rise-3" aria-hidden="true">
            <img src="/art/tysm-feedback-reliquary.png" alt="" />
          </aside>

          <section className="landing-strip rise rise-4" aria-label="Example TYSM event links">
            <span>tysm.in/event/design-workshop</span>
            <span>tysm.in/event/product-launch</span>
            <span>tysm.in/event/office-hours</span>
          </section>
        </main>
      </Shell>
    )
  }

  return (
    <Shell>
      <main className="admin-shell">
        <section className="admin-heading rise rise-1">
          <span className="kicker">Admin</span>
          <h1 className="form-title">Feedback events</h1>
          <p className="form-sub">Create a form, share the link, read responses here.</p>
        </section>

        <section className="dashboard-grid">
          <form className="panel create-panel rise rise-2" onSubmit={submit}>
            <div className="panel-head">
              <div>
                <h2>New event</h2>
                <p>Use a clear name attendees will recognise.</p>
              </div>
            </div>

            <label className="field">
              <span className="field-label">Event name</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Design workshop"
                maxLength={120}
              />
            </label>

            <label className="field">
              <span className="field-label">Public link</span>
              <div className="slug-row">
                <span className="slug-prefix">tysm.in/event/</span>
                <input
                  className={`input slug-input ${
                    slugStatus === 'taken' || slugStatus === 'invalid' ? 'input-error' : ''
                  }`}
                  value={slug}
                  onChange={(event) => onSlugChange(event.target.value)}
                  placeholder="design-workshop"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={60}
                />
              </div>
              {slugStatus === 'checking' && <span className="hint">Checking availability...</span>}
              {slugStatus === 'available' && (
                <span className="hint hint-ok">tysm.in/event/{slug} is available</span>
              )}
              {slugStatus === 'taken' && (
                <span className="hint hint-error">tysm.in/event/{slug} is already taken</span>
              )}
              {slugStatus === 'invalid' && (
                <span className="hint hint-error">Use 2-60 lowercase letters, numbers and hyphens.</span>
              )}
            </label>

            <label className="field">
              <span className="field-label">
                Event date <span className="opt">optional</span>
              </span>
              <input
                className="input"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">
                Event image <span className="opt">optional</span>
              </span>
              {imageUrl ? (
                <div className="image-preview">
                  <img src={imageUrl} alt="Event preview" />
                </div>
              ) : (
                <div className="image-empty">Add one event photo for the feedback form header.</div>
              )}
              <label className="btn btn-secondary image-picker">
                {imageUploading ? 'Uploading...' : imageUrl ? 'Change image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={imageUploading}
                  onChange={(event) => uploadImage(event.target.files?.[0], 'create')}
                />
              </label>
            </label>

            <label className="field">
              <span className="field-label">
                Prompt <span className="opt">optional</span>
              </span>
              <textarea
                className="input textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Thanks for joining. Your feedback helps shape the next one."
                maxLength={600}
                rows={4}
              />
            </label>

            {error && <p className="hint hint-error">{error}</p>}

            <button className={`btn btn-primary btn-block ${!ready || saving ? 'btn-disabled' : ''}`}>
              {saving ? 'Creating...' : 'Create feedback link'}
            </button>
          </form>

          <section className="panel events-panel rise rise-3">
            <div className="panel-head">
              <div>
                <h2>Events</h2>
                <p>{eventsLoading ? 'Loading...' : `${events.length} total`}</p>
              </div>
            </div>

            <div className="event-list">
              {events.length === 0 && !eventsLoading ? (
                <div className="empty-mini">No events yet.</div>
              ) : (
                events.map((event) => (
                  <button
                    type="button"
                    className={`event-item ${selectedEvent?.id === event.id ? 'event-item-active' : ''}`}
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                  >
                    <span>
                      <strong>{event.title}</strong>
                      <small>{formatEventDate(event.eventDate)}</small>
                    </span>
                    <em>{event.isActive ? 'Open' : 'Closed'}</em>
                  </button>
                ))
              )}
            </div>
          </section>
        </section>

        {selectedEvent && (
          <section className="panel detail-panel rise rise-4">
            <div className="detail-layout">
              <div className="share-box">
                {selectedEvent.imageUrl && (
                  <div className="detail-image">
                    <img src={selectedEvent.imageUrl} alt={selectedEvent.title} />
                  </div>
                )}
                <div className="panel-head">
                  <div>
                    <h2>{selectedEvent.title}</h2>
                    <p>{selectedEvent.description || 'Ready for attendee feedback.'}</p>
                  </div>
                </div>

                <div className="share-link-row">
                  <input className="input share-input" readOnly value={eventUrl} />
                  <button className="btn btn-primary" type="button" onClick={copySelectedLink}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="qr-block">
                  <div className="qr-frame">
                    <Qr value={eventUrl} size={172} />
                  </div>
                  <span className="qr-cap">tysm.in/event/{selectedEvent.slug}</span>
                </div>

                <div className="detail-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => navigate(`/event/${selectedEvent.slug}`)}>
                    Open form
                  </button>
                  <label className="btn btn-secondary image-action">
                    {detailImageUploading ? 'Uploading...' : selectedEvent.imageUrl ? 'Replace image' : 'Add image'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={detailImageUploading}
                      onChange={(event) => uploadImage(event.target.files?.[0], 'detail')}
                    />
                  </label>
                  <button className="btn btn-ghost" type="button" onClick={toggleActive}>
                    {selectedEvent.isActive ? 'Close form' : 'Reopen form'}
                  </button>
                </div>
              </div>

              <div className="responses-box">
                <div className="stats-row">
                  <div>
                    <strong>{responses.length}</strong>
                    <span>responses</span>
                  </div>
                  <div>
                    <strong>{responseAverage}</strong>
                    <span>avg rating</span>
                  </div>
                </div>

                <div className="response-list">
                  {responsesLoading ? (
                    <div className="empty-mini">Loading responses...</div>
                  ) : responses.length === 0 ? (
                    <div className="empty-mini">No responses yet.</div>
                  ) : (
                    responses.map((response) => (
                      <article className="response-item" key={response.id}>
                        <div className="response-meta">
                          <strong>{response.attendeeName || 'Anonymous'}</strong>
                          <span>{formatSubmittedAt(response.createdAt)}</span>
                        </div>
                        <Stars value={response.rating} size={18} />
                        <p>{response.enjoyed}</p>
                        <p>{response.improve}</p>
                        {response.anythingElse && <p>{response.anythingElse}</p>}
                        {response.attendeeEmail && response.allowContact && (
                          <a href={`mailto:${response.attendeeEmail}`} className="contact-link">
                            {response.attendeeEmail}
                          </a>
                        )}
                        {response.attendeeEmail && !response.allowContact && (
                          <span className="contact-muted">No follow-up requested</span>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </Shell>
  )
}

function Shell({ children, landing = false }: { children: ReactNode; landing?: boolean }) {
  return (
    <div className={`page admin-page ${landing ? 'landing-page' : ''}`}>
      <header className="topbar rise rise-1">
        <Brand />
        <AccountNav />
      </header>
      {children}
      <footer className="footer">
        <span>TYSM</span>
        <span>feedback, with gratitude</span>
      </footer>
    </div>
  )
}
