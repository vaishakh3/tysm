import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Brand } from './Brand'
import { Stars } from './Stars'
import { navigate } from '../router'
import { slugify } from '../lib'
import { supabaseReady } from '../supabase'
import { signInWithGoogle, signOut, useAuth } from '../auth'
import {
  createSpace,
  deleteSpace,
  deleteTestimonial,
  getAllTestimonials,
  getMySpaces,
  getSpaceBySlug,
  isSpaceSlugAvailable,
  setTestimonialApproved,
} from '../testimonials'
import type { Space, Testimonial } from '../types'

const SITE = 'https://www.tysm.in'
const isValidSpaceSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,39}$/.test(s)

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="copy-row">
      <span className="copy-row-label">{label}</span>
      <button
        className={`copy-field ${copied ? 'copy-field-done' : ''}`}
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }}
      >
        <span className="copy-field-val">{value}</span>
        <span className="copy-field-act">{copied ? 'Copied ✓' : 'Copy'}</span>
      </button>
    </div>
  )
}

/** Signed-out pitch + Google sign-in (mirrors the tip create gate). */
function SignedOutGate() {
  return (
    <div className="page">
      <header className="topbar rise rise-1">
        <Brand />
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          Home
        </button>
      </header>
      <main className="hero">
        <span className="kicker rise rise-1">For businesses · testimonials</span>
        <h1 className="rise rise-2">
          Collect glowing
          <span className="thanks">thank&#8209;yous.</span>
        </h1>
        <p className="sub rise rise-3">
          Spin up a branded page, collect testimonials from happy customers, and embed a “wall of
          love” on your site in minutes. No code, no payment setup.
        </p>
        <div className="cta-row rise rise-3">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => (supabaseReady ? signInWithGoogle('/walls') : undefined)}
            disabled={!supabaseReady}
          >
            Continue with Google →
          </button>
        </div>
        {!supabaseReady && (
          <p className="form-error rise rise-4">Backend not configured (missing Supabase env vars).</p>
        )}
      </main>
    </div>
  )
}

/** Form to create a new collection space. */
function CreateSpace({ ownerId, onCreated }: { ownerId: string; onCreated: (s: Space) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [headline, setHeadline] = useState('')
  const [intro, setIntro] = useState('')
  const [color, setColor] = useState('#d4ff3f')
  const [avail, setAvail] = useState<{ slug: string; free: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const slugEdited = useRef(false)

  useEffect(() => {
    if (!slugEdited.current) setSlug(slugify(name))
  }, [name])

  const slugValid = isValidSpaceSlug(slug)
  useEffect(() => {
    if (!slugValid) return
    let active = true
    const id = setTimeout(async () => {
      const free = await isSpaceSlugAvailable(slug)
      if (active) setAvail({ slug, free })
    }, 400)
    return () => {
      active = false
      clearTimeout(id)
    }
  }, [slug, slugValid])

  const resolved = avail && avail.slug === slug
  const status = !slug ? 'idle' : !slugValid ? 'invalid' : resolved ? (avail.free ? 'free' : 'taken') : 'checking'
  const ready = name.trim().length > 0 && status === 'free'

  const submit = async () => {
    if (!ready || saving) return
    setSaving(true)
    setError(null)
    const res = await createSpace(
      { slug, name: name.trim(), headline: headline.trim(), intro: intro.trim(), color },
      ownerId,
    )
    setSaving(false)
    if (res.ok) onCreated(res.space)
    else if (res.reason === 'taken') setError('That link is taken — try another.')
    else setError('Could not create the space. Please try again.')
  }

  return (
    <div className="space-form rise rise-3">
      <h2>New collection page</h2>
      <label className="field-label">Business / product name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Studio" maxLength={80} />

      <label className="field-label">Link</label>
      <div className="slug-field">
        <span className="slug-prefix">tysm.in/c/</span>
        <input
          className="input slug-input"
          value={slug}
          onChange={(e) => {
            slugEdited.current = true
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').slice(0, 40))
          }}
          placeholder="acme"
        />
      </div>
      <div className={`slug-status slug-${status}`}>
        {status === 'invalid' && 'Use 2–40 letters, numbers or hyphens.'}
        {status === 'checking' && 'Checking…'}
        {status === 'free' && '✓ available'}
        {status === 'taken' && 'Already taken.'}
      </div>

      <label className="field-label">Prompt for customers (optional)</label>
      <input
        className="input"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder={`Share your experience with ${name || 'us'}`}
        maxLength={140}
      />

      <label className="field-label">Intro line (optional)</label>
      <input className="input" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="We'd love a quick word!" maxLength={400} />

      <label className="field-label">Brand colour</label>
      <div className="color-field">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <span>{color}</span>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className={`btn btn-primary btn-block ${!ready ? 'btn-disabled' : ''}`} onClick={submit} disabled={!ready || saving}>
        {saving ? 'Creating…' : 'Create page →'}
      </button>
    </div>
  )
}

/** Per-space management: share links, embed, and approve/reject testimonials. */
function ManageSpace({ slug }: { slug: string }) {
  const [space, setSpace] = useState<Space | null | undefined>(undefined)
  const [items, setItems] = useState<Testimonial[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getSpaceBySlug(slug).then(async (s) => {
      if (!active) return
      setSpace(s)
      if (s) setItems(await getAllTestimonials(s.id))
    })
    return () => {
      active = false
    }
  }, [slug])

  const counts = useMemo(() => {
    const list = items ?? []
    return { pending: list.filter((t) => !t.approved).length, approved: list.filter((t) => t.approved).length }
  }, [items])

  if (space === undefined) {
    return (
      <main className="empty-state">
        <div className="empty-emoji loading-pulse">💬</div>
      </main>
    )
  }
  if (!space) {
    return (
      <main className="empty-state">
        <div className="empty-emoji">🙈</div>
        <h2>Space not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/walls')}>
          Back to dashboard
        </button>
      </main>
    )
  }

  const collectUrl = `${SITE}/c/${space.slug}`
  const wallUrl = `${SITE}/w/${space.slug}`
  const embed = `<iframe src="${SITE}/embed/${space.slug}" width="100%" height="600" style="border:0" loading="lazy" title="${space.name} testimonials"></iframe>`

  const update = (id: string, patch: Partial<Testimonial>) =>
    setItems((cur) => (cur ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const toggle = async (t: Testimonial) => {
    setBusy(t.id)
    const ok = await setTestimonialApproved(t.id, !t.approved)
    if (ok) update(t.id, { approved: !t.approved })
    setBusy(null)
  }
  const remove = async (t: Testimonial) => {
    setBusy(t.id)
    const ok = await deleteTestimonial(t.id)
    if (ok) setItems((cur) => (cur ?? []).filter((x) => x.id !== t.id))
    setBusy(null)
  }
  const removeSpace = async () => {
    if (!window.confirm(`Delete “${space.name}” and all its testimonials? This can’t be undone.`)) return
    if (await deleteSpace(space.id)) navigate('/walls')
  }

  const accent = { '--accent': space.color || '#d4ff3f' } as CSSProperties

  return (
    <main className="dash-main" style={accent}>
      <button className="link-btn back-link" onClick={() => navigate('/walls')}>
        ← All pages
      </button>
      <h1 className="dash-title">{space.name}</h1>

      <section className="dash-section">
        <h2>Share &amp; embed</h2>
        <CopyRow label="Collect link (send to customers)" value={collectUrl} />
        <CopyRow label="Wall of love (public page)" value={wallUrl} />
        <CopyRow label="Embed on your website" value={embed} />
        <div className="dash-quick">
          <a className="btn btn-ghost btn-sm" href={`/c/${space.slug}`} target="_blank" rel="noreferrer">
            Open collect page →
          </a>
          <a className="btn btn-ghost btn-sm" href={`/w/${space.slug}`} target="_blank" rel="noreferrer">
            Open wall →
          </a>
        </div>
      </section>

      <section className="dash-section">
        <h2>
          Testimonials{' '}
          <span className="dash-counts">
            {counts.pending} pending · {counts.approved} live
          </span>
        </h2>
        {items === null ? (
          <p className="muted-line">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted-line">No submissions yet. Share your collect link to start gathering thank-yous.</p>
        ) : (
          <div className="review-list">
            {items.map((t) => (
              <div key={t.id} className={`review-card ${t.approved ? 'review-live' : 'review-pending'}`}>
                <div className="review-top">
                  <Stars value={t.rating} size={15} />
                  <span className={`review-badge ${t.approved ? 'badge-live' : 'badge-pending'}`}>
                    {t.approved ? 'Live' : 'Pending'}
                  </span>
                </div>
                <p className="review-msg">{t.message}</p>
                <div className="review-author">
                  <b>{t.authorName}</b>
                  {t.authorRole && <small>{t.authorRole}</small>}
                </div>
                <div className="review-actions">
                  <button className="btn btn-sm accent-btn" onClick={() => toggle(t)} disabled={busy === t.id}>
                    {t.approved ? 'Unpublish' : 'Approve →'}
                  </button>
                  <button className="btn btn-ghost btn-sm danger-btn" onClick={() => remove(t)} disabled={busy === t.id}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <button className="link-btn danger-btn" onClick={removeSpace}>
          Delete this page
        </button>
      </section>
    </main>
  )
}

/** Dashboard root: list spaces + create, or manage one when a slug is given. */
export function WallsDashboard({ slug }: { slug?: string }) {
  const { user, loading } = useAuth()
  const [spaces, setSpaces] = useState<Space[] | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    getMySpaces(user.id).then((s) => {
      if (active) setSpaces(s)
    })
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <div className="page" />
  if (!user) return <SignedOutGate />

  if (slug) {
    return (
      <div className="page">
        <header className="topbar rise rise-1">
          <Brand tagline={false} />
          <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
            Sign out
          </button>
        </header>
        <ManageSpace slug={slug} />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar rise rise-1">
        <Brand tagline={false} />
        <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
          Sign out
        </button>
      </header>
      <main className="dash-main">
        <h1 className="dash-title rise rise-2">Your collection pages</h1>

        {spaces === null ? (
          <p className="muted-line">Loading…</p>
        ) : spaces.length === 0 && !creating ? (
          <div className="dash-empty rise rise-3">
            <div className="empty-emoji">🌟</div>
            <p>No collection pages yet. Make one to start gathering testimonials.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Create a page →
            </button>
          </div>
        ) : (
          <>
            <div className="space-list rise rise-3">
              {spaces?.map((s) => (
                <button key={s.id} className="space-tile" onClick={() => navigate(`/walls/${s.slug}`)}>
                  <span className="space-tile-mark" style={{ background: s.color || '#d4ff3f' }}>
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="space-tile-meta">
                    <b>{s.name}</b>
                    <small>tysm.in/c/{s.slug}</small>
                  </span>
                  <span className="space-tile-go">→</span>
                </button>
              ))}
            </div>
            {creating ? null : (
              <button className="btn btn-secondary dash-add" onClick={() => setCreating(true)}>
                + New page
              </button>
            )}
          </>
        )}

        {creating && (
          <CreateSpace
            ownerId={user.id}
            onCreated={(s) => {
              setCreating(false)
              setSpaces((cur) => [s, ...(cur ?? [])])
              navigate(`/walls/${s.slug}`)
            }}
          />
        )}
      </main>
    </div>
  )
}
