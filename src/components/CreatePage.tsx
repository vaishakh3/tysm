import { useEffect, useMemo, useRef, useState } from 'react'
import { Brand } from './Brand'
import { Qr } from './Qr'
import { navigate } from '../router'
import { buildSlugUrl, dedupe, isValidSlug, isValidUpi, slugify } from '../lib'
import { celebrate } from '../confetti'
import { createCreator, getMyCreator, isSlugAvailable, updateCreator, type Creator } from '../db'
import { supabaseReady } from '../supabase'
import { signInWithGoogle, signOut, useAuth } from '../auth'

const EMOJIS = ['😊', '🎨', '🎸', '☕', '📸', '✍️', '🍳', '💻', '🎥', '🧑‍🏫']
const DEFAULT_PRESETS = '49, 99, 199'

type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

export function CreatePage() {
  const { user, loading: authLoading } = useAuth()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [upi, setUpi] = useState('')
  const [bio, setBio] = useState('')
  const [emoji, setEmoji] = useState('😊')
  const [presetText, setPresetText] = useState(DEFAULT_PRESETS)

  const [mine, setMine] = useState<{ ownerId: string; creator: Creator | null } | null>(null)
  const [avail, setAvail] = useState<{ slug: string; free: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [claimedSlug, setClaimedSlug] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const slugEdited = useRef(false)
  const celebrated = useRef(false)

  const mineLoaded = Boolean(user) && mine?.ownerId === user?.id
  const myCreator = mineLoaded ? (mine?.creator ?? null) : null
  const editing = myCreator !== null

  // Load the signed-in user's existing page (and prefill the form for editing).
  useEffect(() => {
    if (!user) return
    let active = true
    getMyCreator(user.id).then((creator) => {
      if (!active) return
      setMine({ ownerId: user.id, creator })
      if (creator) {
        slugEdited.current = true
        setName(creator.name)
        setSlug(creator.slug)
        setUpi(creator.upi)
        setBio(creator.bio ?? '')
        setEmoji(creator.emoji ?? '😊')
        setPresetText((creator.presets ?? []).join(', '))
      }
    })
    return () => {
      active = false
    }
  }, [user])

  const presets = useMemo(
    () =>
      dedupe(
        presetText
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0),
      ).slice(0, 4),
    [presetText],
  )

  const upiValid = isValidUpi(upi)
  const slugValid = slug.length > 0 && isValidSlug(slug)

  // Auto-suggest a slug from the name until the user edits the slug themselves.
  useEffect(() => {
    if (!slugEdited.current) setSlug(slugify(name))
  }, [name])

  // Debounced slug availability check (skipped while editing an existing page).
  useEffect(() => {
    if (!slugValid || editing) return
    let active = true
    const id = setTimeout(async () => {
      const free = await isSlugAvailable(slug)
      if (active) setAvail({ slug, free })
    }, 400)
    return () => {
      active = false
      clearTimeout(id)
    }
  }, [slug, slugValid, editing])

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

  const detailsValid = name.trim().length > 0 && upiValid
  const ready = editing ? detailsValid : detailsValid && slugStatus === 'available'

  useEffect(() => {
    if (editing) return
    if (ready && !celebrated.current) {
      celebrated.current = true
      celebrate()
    }
    if (!ready) celebrated.current = false
  }, [ready, editing])

  const shareUrl = claimedSlug ? buildSlugUrl(claimedSlug) : ''

  const onSlugChange = (value: string) => {
    slugEdited.current = true
    // Allow typing hyphens (don't strip a trailing one mid-keystroke).
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .slice(0, 30),
    )
  }

  const submit = async () => {
    if (!ready || saving || !user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const payload: Creator = {
      slug,
      name: name.trim(),
      upi: upi.trim(),
      bio: bio.trim() || undefined,
      emoji,
      presets: presets.length ? presets : [49, 99, 199],
    }
    if (editing) {
      const res = await updateCreator(payload, user.id)
      setSaving(false)
      if (res.ok) {
        setMine({ ownerId: user.id, creator: res.creator })
        setSaved(true)
        setTimeout(() => setSaved(false), 2200)
      } else {
        setError('Could not save your changes. Please try again.')
      }
      return
    }
    const res = await createCreator(payload, user.id)
    setSaving(false)
    if (res.ok) {
      setMine({ ownerId: user.id, creator: res.creator })
      setClaimedSlug(res.creator.slug)
      celebrate()
    } else if (res.reason === 'taken') {
      setAvail({ slug, free: false })
    } else {
      setError('Could not save your page. Please try again in a moment.')
    }
  }

  const copy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // ---- Backend missing ----
  if (!supabaseReady) {
    return (
      <Shell>
        <div className="incomplete rise rise-2">
          Backend not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </div>
      </Shell>
    )
  }

  // ---- Auth loading ----
  if (authLoading) {
    return (
      <Shell>
        <p className="form-sub rise rise-1">Loading…</p>
      </Shell>
    )
  }

  // ---- Signed out: sign-in gate ----
  if (!user) {
    return (
      <Shell>
        <h1 className="form-title rise rise-1">
          Claim your <em>tip page</em>
        </h1>
        <p className="form-sub rise rise-2">
          Sign in to claim your personal tysm.in link and manage your page anytime.
        </p>
        <button className="btn btn-primary btn-lg btn-block rise rise-2" onClick={() => signInWithGoogle('/create')}>
          Continue with Google →
        </button>
        <p className="hint rise rise-3" style={{ marginTop: 14, textAlign: 'center' }}>
          We only use this to let you edit your page later.
        </p>
      </Shell>
    )
  }

  // ---- Claim success ----
  if (claimedSlug) {
    return (
      <Shell>
        <div className="share-card rise">
          <div className="share-head">
            <span className="share-emoji">{emoji}</span>
            <div>
              <div className="share-name">You’re live, {name.trim()}! 🎉</div>
              <div className="share-meta">Share this link to start collecting tips.</div>
            </div>
          </div>
          <div className="share-link-row">
            <input className="input share-input" readOnly value={shareUrl} />
            <button className="btn btn-primary" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="qr-block">
            <div className="qr-frame">
              <Qr value={shareUrl} size={172} />
            </div>
            <span className="qr-cap">or let people scan this</span>
          </div>
          <button className="btn btn-secondary btn-block" onClick={() => navigate(`/${claimedSlug}`)}>
            Open my page →
          </button>
        </div>
      </Shell>
    )
  }

  // ---- Claim / edit form ----
  return (
    <Shell user={user.email ?? undefined}>
      <h1 className="form-title rise rise-1">
        {editing ? (
          <>
            Your <em>tip page</em>
          </>
        ) : (
          <>
            Claim your <em>tip page</em>
          </>
        )}
      </h1>
      <p className="form-sub rise rise-2">
        {editing ? (
          <>
            Live at{' '}
            <button className="link-inline" onClick={() => navigate(`/${slug}`)}>
              tysm.in/{slug} →
            </button>
          </>
        ) : (
          'Pick a name people will recognise — it becomes your personal tysm.in link.'
        )}
      </p>

      <label className="field rise rise-2">
        <span className="field-label">Your name or brand</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aisha Verma"
          maxLength={40}
        />
      </label>

      <label className="field rise rise-2">
        <span className="field-label">Your link</span>
        {editing ? (
          <div className="slug-row slug-locked">
            <span className="slug-prefix">tysm.in/</span>
            <input className="input slug-input" value={slug} readOnly disabled />
          </div>
        ) : (
          <div className="slug-row">
            <span className="slug-prefix">tysm.in/</span>
            <input
              className={`input slug-input ${slugStatus === 'taken' || slugStatus === 'invalid' ? 'input-error' : ''}`}
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="aisha"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
            />
          </div>
        )}
        {editing ? (
          <span className="hint">Your link can’t be changed.</span>
        ) : (
          <>
            {slugStatus === 'checking' && <span className="hint">Checking availability…</span>}
            {slugStatus === 'available' && (
              <span className="hint hint-ok">tysm.in/{slug} is available 🎉</span>
            )}
            {slugStatus === 'taken' && (
              <span className="hint hint-error">tysm.in/{slug} is already taken</span>
            )}
            {slugStatus === 'invalid' && (
              <span className="hint hint-error">
                2–30 chars: lowercase letters, numbers and hyphens
              </span>
            )}
          </>
        )}
      </label>

      <label className="field rise rise-3">
        <span className="field-label">UPI ID (VPA)</span>
        <input
          className={`input ${upi && !upiValid ? 'input-error' : ''}`}
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
          placeholder="aisha@okhdfcbank"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {upi && !upiValid && (
          <span className="hint hint-error">Enter a valid UPI ID like name@bank</span>
        )}
      </label>

      <label className="field rise rise-3">
        <span className="field-label">
          Short bio <span className="opt">(optional)</span>
        </span>
        <input
          className="input"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Illustrator. Buy me a chai ☕"
          maxLength={80}
        />
      </label>

      <div className="field rise rise-3">
        <span className="field-label">Pick an avatar</span>
        <div className="emoji-row">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`emoji-btn ${emoji === e ? 'emoji-active' : ''}`}
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <label className="field rise rise-4">
        <span className="field-label">
          Suggested amounts (₹) <span className="opt">(comma separated)</span>
        </span>
        <input
          className="input"
          value={presetText}
          onChange={(e) => setPresetText(e.target.value)}
          placeholder="49, 99, 199"
          inputMode="numeric"
        />
      </label>

      {error && <div className="hint hint-error rise">{error}</div>}

      <button
        className={`btn btn-primary btn-lg btn-block rise rise-4 ${!ready || saving ? 'btn-disabled' : ''}`}
        onClick={submit}
        aria-disabled={!ready || saving}
      >
        {saving
          ? editing
            ? 'Saving…'
            : 'Claiming…'
          : editing
            ? saved
              ? 'Saved ✓'
              : 'Save changes'
            : ready
              ? `Claim tysm.in/${slug} →`
              : 'Fill the details above'}
      </button>

      {editing && (
        <button className="btn btn-secondary btn-block rise rise-4" onClick={() => navigate(`/${slug}`)}>
          View my live page →
        </button>
      )}
    </Shell>
  )
}

function Shell({ children, user }: { children: React.ReactNode; user?: string }) {
  return (
    <div className="page">
      <header className="topbar rise rise-1">
        <Brand tagline={false} />
        {user && (
          <div className="account">
            <span className="account-email">{user}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="form-wrap">{children}</main>
    </div>
  )
}
