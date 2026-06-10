import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Brand } from './Brand'
import { Stars } from './Stars'
import { VideoRecorder } from './VideoRecorder'
import { navigate } from '../router'
import { celebrate } from '../confetti'
import { getSpaceBySlug, submitTestimonial, uploadTestimonialMedia } from '../testimonials'
import type { Space } from '../types'

/** Public page where customers leave a testimonial for a space (/c/<slug>). */
export function CollectPage({ slug }: { slug: string }) {
  const [state, setState] = useState<{ slug: string; space: Space | null } | null>(null)
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  useEffect(() => {
    let active = true
    getSpaceBySlug(slug).then((space) => {
      if (active) setState({ slug, space })
    })
    return () => {
      active = false
    }
  }, [slug])

  const loading = state?.slug !== slug
  const space = loading ? null : state?.space

  const accent = { '--accent': space?.color || '#d4ff3f' } as CSSProperties
  const ready = message.trim().length > 0 && name.trim().length > 0

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo is too large — keep it under 5 MB.')
      return
    }
    setError(null)
    setPhoto(file)
  }

  const submit = async () => {
    if (!ready || sending || !space) return
    setSending(true)
    setError(null)
    let authorAvatar: string | undefined
    let videoUrl: string | undefined
    if (photo) {
      const url = await uploadTestimonialMedia(photo, space.id, 'photo')
      if (!url) {
        setSending(false)
        setError('Could not upload your photo. Remove it or try again.')
        return
      }
      authorAvatar = url
    }
    if (video) {
      const url = await uploadTestimonialMedia(video, space.id, 'video')
      if (!url) {
        setSending(false)
        setError('Could not upload your video. Remove it or try again.')
        return
      }
      videoUrl = url
    }
    const ok = await submitTestimonial({
      spaceId: space.id,
      authorName: name.trim(),
      authorRole: role.trim() || undefined,
      authorAvatar,
      videoUrl,
      rating,
      message: message.trim(),
    })
    setSending(false)
    if (ok) {
      setDone(true)
      celebrate()
    } else {
      setError('Could not send that just now. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <header className="topbar">
          <Brand tagline={false} />
        </header>
        <main className="empty-state">
          <div className="empty-emoji loading-pulse">💬</div>
          <p>Loading…</p>
        </main>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="page">
        <header className="topbar">
          <Brand tagline={false} />
        </header>
        <main className="empty-state">
          <div className="empty-emoji">🙈</div>
          <h2>This page isn’t here</h2>
          <p>The link may be mistyped, or this collection page doesn’t exist.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="page" style={accent}>
      <header className="topbar rise rise-1">
        <Brand tagline={false} />
      </header>

      <main className="collect-main">
        <div className="collect-card rise rise-2">
          {done ? (
            <div className="collect-done">
              <div className="collect-logo">{space.logo ? <img src={space.logo} alt="" /> : '💜'}</div>
              <h1>Thank you!</h1>
              <p>
                Your message to <b>{space.name}</b> has been sent. It’ll appear once they approve it.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                What is TYSM? →
              </button>
            </div>
          ) : (
            <>
              <div className="collect-head">
                <div className="collect-logo">
                  {space.logo ? <img src={space.logo} alt="" /> : space.name.charAt(0).toUpperCase()}
                </div>
                <h1>{space.headline || `Share your experience with ${space.name}`}</h1>
                {space.intro && <p className="collect-intro">{space.intro}</p>}
              </div>

              <label className="field-label">How was it?</label>
              <Stars value={rating} onChange={setRating} size={30} />

              <textarea
                className="input collect-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you love? Be as specific as you like…"
                maxLength={1000}
                rows={5}
              />

              <div className="collect-row">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                />
                <input
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role, company (optional)"
                  maxLength={100}
                />
              </div>

              <div className="collect-media">
                <div className="collect-photo">
                  <div className="collect-photo-preview">
                    {photoPreview ? <img src={photoPreview} alt="" /> : (name.trim().charAt(0).toUpperCase() || '🙂')}
                  </div>
                  <div className="collect-photo-actions">
                    <span className="field-label">Your photo (optional)</span>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        onPickPhoto(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                    <div className="vid-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => photoRef.current?.click()}>
                        {photo ? 'Change photo' : 'Add photo'}
                      </button>
                      {photo && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="collect-video">
                  <span className="field-label">Add a video testimonial (optional)</span>
                  <VideoRecorder value={video} onChange={setVideo} />
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                className={`btn btn-primary btn-lg btn-block accent-btn ${!ready ? 'btn-disabled' : ''}`}
                onClick={submit}
                disabled={!ready || sending}
              >
                {sending ? 'Sending…' : 'Send my thank-you →'}
              </button>
              <p className="collect-foot">Powered by TYSM · the home of thank-yous</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
