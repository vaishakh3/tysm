import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { getFeedbackEventBySlug, submitFeedback, type FeedbackEvent } from '../db'
import { formatEventDate } from '../lib'
import { supabaseReady } from '../supabase'
import { Brand } from './Brand'
import { Stars } from './Stars'
import { celebrate } from '../confetti'

export function EventFeedbackPage({ slug }: { slug: string }) {
  const [eventState, setEventState] = useState<{ slug: string; event: FeedbackEvent | null } | null>(
    null,
  )
  const [submitted, setSubmitted] = useState(false)
  const [attendeeName, setAttendeeName] = useState('')
  const [allowContact, setAllowContact] = useState(false)
  const [attendeeEmail, setAttendeeEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [enjoyed, setEnjoyed] = useState('')
  const [improve, setImprove] = useState('')
  const [anythingElse, setAnythingElse] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const event = eventState?.slug === slug ? eventState.event : null
  const loading = eventState?.slug !== slug

  useEffect(() => {
    let active = true
    getFeedbackEventBySlug(slug).then((item) => {
      if (!active) return
      setEventState({ slug, event: item })
    })

    return () => {
      active = false
    }
  }, [slug])

  const emailLooksOk =
    !allowContact || attendeeEmail.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())
  const ready = rating > 0 && enjoyed.trim().length > 0 && improve.trim().length > 0 && emailLooksOk

  const onSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    if (!event || !ready || saving) return

    setSaving(true)
    setError(null)
    const ok = await submitFeedback({
      eventId: event.id,
      attendeeName: attendeeName.trim() || undefined,
      attendeeEmail: allowContact ? attendeeEmail.trim() || undefined : undefined,
      rating,
      enjoyed: enjoyed.trim(),
      improve: improve.trim(),
      anythingElse: anythingElse.trim() || undefined,
      allowContact,
    })
    setSaving(false)

    if (!ok) {
      setError('Could not send your feedback. Please try once more.')
      return
    }

    setSubmitted(true)
    celebrate()
  }

  if (!supabaseReady) {
    return (
      <PublicShell>
        <div className="empty-state rise rise-1">
          <span className="kicker">Setup needed</span>
          <h1 className="form-title">Feedback is not connected yet.</h1>
          <p className="form-sub">The TYSM admin needs to finish Supabase setup first.</p>
        </div>
      </PublicShell>
    )
  }

  if (loading) {
    return (
      <PublicShell>
        <p className="form-sub rise rise-1">Loading event...</p>
      </PublicShell>
    )
  }

  if (!event) {
    return (
      <PublicShell>
        <div className="empty-state rise rise-1">
          <span className="kicker">Closed</span>
          <h1 className="form-title">This feedback link is not active.</h1>
          <p className="form-sub">Check the event URL or ask the organiser for a new link.</p>
        </div>
      </PublicShell>
    )
  }

  if (submitted) {
    return (
      <PublicShell>
        <div className="thanks-panel rise rise-1">
          <span className="kicker">Sent</span>
          <h1 className="form-title">
            Thank you <em>so much.</em>
          </h1>
          <p className="form-sub">Your feedback for {event.title} has been recorded.</p>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <main className="feedback-page">
        <section className="event-hero rise rise-1">
          {event.imageUrl && (
            <div className="event-hero-image">
              <img src={event.imageUrl} alt={event.title} />
            </div>
          )}
          <span className="kicker">{formatEventDate(event.eventDate)}</span>
          <h1>{event.title}</h1>
          <p>{event.description || 'Thanks for joining. Share what worked and what should improve.'}</p>
        </section>

        <form className="panel feedback-form rise rise-2" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">
              Your name <span className="opt">optional</span>
            </span>
            <input
              className="input"
              value={attendeeName}
              onChange={(event) => setAttendeeName(event.target.value)}
              placeholder="Vaishakh"
              maxLength={80}
            />
          </label>

          <div className="field">
            <span className="field-label">Overall rating</span>
            <Stars value={rating} onChange={setRating} size={32} />
          </div>

          <label className="field">
            <span className="field-label">What worked well?</span>
            <textarea
              className="input textarea"
              value={enjoyed}
              onChange={(event) => setEnjoyed(event.target.value)}
              placeholder="The demo, discussion, venue, format..."
              rows={5}
              maxLength={1600}
            />
          </label>

          <label className="field">
            <span className="field-label">What should be better next time?</span>
            <textarea
              className="input textarea"
              value={improve}
              onChange={(event) => setImprove(event.target.value)}
              placeholder="Topics, timing, logistics, follow-up..."
              rows={5}
              maxLength={1600}
            />
          </label>

          <label className="field">
            <span className="field-label">
              Anything else <span className="opt">optional</span>
            </span>
            <textarea
              className="input textarea"
              value={anythingElse}
              onChange={(event) => setAnythingElse(event.target.value)}
              placeholder="One more thought..."
              rows={3}
              maxLength={1000}
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={allowContact}
              onChange={(event) => setAllowContact(event.target.checked)}
            />
            <span>You can contact me about this feedback</span>
          </label>

          {allowContact && (
            <label className="field">
              <span className="field-label">Email</span>
              <input
                className={`input ${!emailLooksOk ? 'input-error' : ''}`}
                type="email"
                value={attendeeEmail}
                onChange={(event) => setAttendeeEmail(event.target.value)}
                placeholder="you@example.com"
                maxLength={160}
              />
              {!emailLooksOk && <span className="hint hint-error">Enter a valid email.</span>}
            </label>
          )}

          {error && <p className="hint hint-error">{error}</p>}

          <button className={`btn btn-primary btn-lg btn-block ${!ready || saving ? 'btn-disabled' : ''}`}>
            {saving ? 'Sending...' : 'Send feedback'}
          </button>
        </form>
      </main>
    </PublicShell>
  )
}

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="page feedback-shell">
      <header className="topbar rise rise-1">
        <Brand />
      </header>
      {children}
      <footer className="footer">
        <span>TYSM</span>
        <span>thank you so much</span>
      </footer>
    </div>
  )
}
