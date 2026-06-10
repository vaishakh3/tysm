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
  importTestimonials,
  isSpaceSlugAvailable,
  setTestimonialApproved,
  updateSpace,
  uploadSpaceLogo,
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

/** Square logo upload with monogram fallback. */
function LogoPicker({
  ownerId,
  logo,
  fallback,
  onChange,
}: {
  ownerId: string
  logo: string | null
  fallback: string
  onChange: (url: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.')
    if (file.size > 5 * 1024 * 1024) return setError('Image is too large — keep it under 5 MB.')
    setError(null)
    setUploading(true)
    const url = await uploadSpaceLogo(file, ownerId)
    setUploading(false)
    if (url) onChange(url)
    else setError('Could not upload that image. Please try again.')
  }

  return (
    <div className="logo-pick">
      <div className="logo-preview">{logo ? <img src={logo} alt="Logo" /> : <span>{fallback}</span>}</div>
      <div className="logo-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo'}
        </button>
        {logo && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
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
  const [logo, setLogo] = useState<string | null>(null)
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
      { slug, name: name.trim(), headline: headline.trim(), intro: intro.trim(), color, logo: logo || undefined },
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

      <label className="field-label">Logo (optional)</label>
      <LogoPicker ownerId={ownerId} logo={logo} fallback={(name.trim().charAt(0) || '★').toUpperCase()} onChange={setLogo} />

      {error && <p className="form-error">{error}</p>}
      <button className={`btn btn-primary btn-block ${!ready ? 'btn-disabled' : ''}`} onClick={submit} disabled={!ready || saving}>
        {saving ? 'Creating…' : 'Create page →'}
      </button>
    </div>
  )
}

function parseBulk(text: string, spaceId: string) {
  const rows: { spaceId: string; authorName: string; authorRole?: string; rating: number; message: string }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split('|').map((p) => p.trim())
    const authorName = parts[0]
    let authorRole: string | undefined
    let rating = 5
    let message: string
    if (parts.length >= 4) {
      authorRole = parts[1] || undefined
      rating = Math.min(5, Math.max(1, parseInt(parts[2], 10) || 5))
      message = parts.slice(3).join(' | ')
    } else if (parts.length === 3) {
      authorRole = parts[1] || undefined
      message = parts[2]
    } else if (parts.length === 2) {
      message = parts[1]
    } else {
      continue
    }
    if (authorName && message) rows.push({ spaceId, authorName, authorRole, rating, message })
  }
  return rows
}

/** Owner-side: add a testimonial manually or bulk-import existing reviews. */
function ImportSection({
  spaceId,
  onImported,
}: {
  spaceId: string
  onImported: (rows: Testimonial[]) => void
}) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [bulk, setBulk] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const toTestimonials = (
    rows: { spaceId: string; authorName: string; authorRole?: string; rating: number; message: string }[],
  ): Testimonial[] =>
    rows.map((r, i) => ({
      id: `imported-${Date.now()}-${i}`,
      spaceId: r.spaceId,
      authorName: r.authorName,
      authorRole: r.authorRole,
      rating: r.rating,
      message: r.message,
      approved: true,
      createdAt: new Date().toISOString(),
    }))

  const addSingle = async () => {
    if (!name.trim() || !message.trim() || busy) return
    setBusy(true)
    setNote(null)
    const row = { spaceId, authorName: name.trim(), authorRole: role.trim() || undefined, rating, message: message.trim() }
    const n = await importTestimonials([row])
    setBusy(false)
    if (n > 0) {
      onImported(toTestimonials([row]))
      setName('')
      setRole('')
      setRating(5)
      setMessage('')
      setNote('Added 1 testimonial (live).')
    } else setNote('Could not add that. Please try again.')
  }

  const addBulk = async () => {
    if (busy) return
    const rows = parseBulk(bulk, spaceId)
    if (rows.length === 0) {
      setNote('Nothing to import — check the format below.')
      return
    }
    setBusy(true)
    setNote(null)
    const n = await importTestimonials(rows)
    setBusy(false)
    if (n > 0) {
      onImported(toTestimonials(rows.slice(0, n)))
      setBulk('')
      setNote(`Imported ${n} testimonial${n === 1 ? '' : 's'} (live).`)
    } else setNote('Could not import. Please try again.')
  }

  return (
    <section className="dash-section">
      <h2>Add or import testimonials</h2>
      <p className="muted-line">Bring over reviews you already have — they go live immediately.</p>
      <div className="import-tabs">
        <button className={`import-tab ${mode === 'single' ? 'import-tab-on' : ''}`} onClick={() => setMode('single')}>
          Add one
        </button>
        <button className={`import-tab ${mode === 'bulk' ? 'import-tab-on' : ''}`} onClick={() => setMode('bulk')}>
          Bulk paste
        </button>
      </div>

      {mode === 'single' ? (
        <div className="import-single">
          <div className="collect-row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" maxLength={80} />
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, company (optional)" maxLength={100} />
          </div>
          <div className="import-rating">
            <span className="field-label">Rating</span>
            <Stars value={rating} onChange={setRating} size={22} />
          </div>
          <textarea
            className="input collect-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did they say?"
            maxLength={1000}
            rows={3}
          />
          <button className={`btn btn-primary btn-sm ${!name.trim() || !message.trim() ? 'btn-disabled' : ''}`} onClick={addSingle} disabled={busy || !name.trim() || !message.trim()}>
            {busy ? 'Adding…' : 'Add testimonial →'}
          </button>
        </div>
      ) : (
        <div className="import-bulk">
          <textarea
            className="input collect-message"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={'One per line:\nPriya Nair | Regular | 5 | Best coffee in town!\nArjun | 4 | Great service\nMeera | Loved it'}
            rows={6}
          />
          <p className="import-hint">
            Format per line: <code>Name | Role | Rating | Message</code>. Role and rating are optional —{' '}
            <code>Name | Message</code> also works.
          </p>
          <button className="btn btn-primary btn-sm" onClick={addBulk} disabled={busy}>
            {busy ? 'Importing…' : 'Import all →'}
          </button>
        </div>
      )}
      {note && <p className="import-note">{note}</p>}
    </section>
  )
}

/** Per-space management: share links, embed, and approve/reject testimonials. */
function ManageSpace({ slug, ownerId }: { slug: string; ownerId: string }) {
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

  const setLogo = async (url: string | null) => {
    if (!space) return
    setSpace({ ...space, logo: url ?? undefined })
    await updateSpace(space.id, { logo: url })
  }

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
  const scriptEmbed = `<script src="${SITE}/embed.js" data-tysm="${space.slug}" async></script>`
  const iframeEmbed = `<iframe src="${SITE}/embed/${space.slug}" width="100%" height="600" style="border:0" loading="lazy" title="${space.name} testimonials"></iframe>`

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
        <h2>Branding</h2>
        <LogoPicker
          ownerId={ownerId}
          logo={space.logo ?? null}
          fallback={(space.name.charAt(0) || '★').toUpperCase()}
          onChange={setLogo}
        />
      </section>

      <section className="dash-section">
        <h2>Share &amp; embed</h2>
        <CopyRow label="Collect link (send to customers)" value={collectUrl} />
        <CopyRow label="Wall of love (public page)" value={wallUrl} />
        <CopyRow label="One-line embed (auto-resizing — recommended)" value={scriptEmbed} />
        <CopyRow label="Iframe embed (fixed height)" value={iframeEmbed} />
        <div className="dash-quick">
          <a className="btn btn-ghost btn-sm" href={`/c/${space.slug}`} target="_blank" rel="noreferrer">
            Open collect page →
          </a>
          <a className="btn btn-ghost btn-sm" href={`/w/${space.slug}`} target="_blank" rel="noreferrer">
            Open wall →
          </a>
        </div>
      </section>

      <ImportSection
        spaceId={space.id}
        onImported={(rows) => setItems((cur) => [...rows, ...(cur ?? [])])}
      />

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
                {t.videoUrl && (
                  <video className="review-video" src={t.videoUrl} controls playsInline preload="metadata" />
                )}
                <p className="review-msg">{t.message}</p>
                <div className="review-author">
                  {t.authorAvatar && <img className="review-avatar" src={t.authorAvatar} alt={t.authorName} />}
                  <span className="review-author-meta">
                    <b>{t.authorName}</b>
                    {t.authorRole && <small>{t.authorRole}</small>}
                  </span>
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
        <ManageSpace slug={slug} ownerId={user.id} />
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
                  <span className="space-tile-mark" style={{ background: s.logo ? 'transparent' : s.color || '#d4ff3f' }}>
                    {s.logo ? <img src={s.logo} alt="" /> : s.name.charAt(0).toUpperCase()}
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
