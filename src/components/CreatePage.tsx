import { useMemo, useState } from 'react'
import { Brand } from './Brand'
import { Qr } from './Qr'
import { navigate } from '../useHashRoute'
import { buildShareUrl, encodeProfile, isValidUpi } from '../lib'
import type { TipProfile } from '../types'

const EMOJIS = ['😊', '🎨', '🎸', '☕', '📸', '✍️', '🍳', '💻', '🎥', '🧑‍🏫']
const DEFAULT_PRESETS = '49, 99, 199'

export function CreatePage() {
  const [name, setName] = useState('')
  const [upi, setUpi] = useState('')
  const [bio, setBio] = useState('')
  const [emoji, setEmoji] = useState('😊')
  const [presetText, setPresetText] = useState(DEFAULT_PRESETS)
  const [copied, setCopied] = useState(false)

  const presets = useMemo(
    () =>
      presetText
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, 4),
    [presetText],
  )

  const upiValid = isValidUpi(upi)
  const ready = name.trim().length > 0 && upiValid

  const shareUrl = useMemo(() => {
    if (!ready) return ''
    const profile: TipProfile = {
      name: name.trim(),
      upi: upi.trim(),
      bio: bio.trim() || undefined,
      emoji,
      presets: presets.length ? presets : [49, 99, 199],
    }
    return buildShareUrl(encodeProfile(profile))
  }, [ready, name, upi, bio, emoji, presets])

  const copy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="page">
      <header className="topbar">
        <Brand tagline={false} />
      </header>

      <main className="form-wrap">
        <h1 className="form-title">Create your tip page</h1>
        <p className="form-sub">No account needed — your page lives entirely in its link.</p>

        <label className="field">
          <span className="field-label">Your name or brand</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aisha Verma"
            maxLength={40}
          />
        </label>

        <label className="field">
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

        <label className="field">
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

        <div className="field">
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

        <label className="field">
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

        {ready ? (
          <div className="share-card">
            <div className="share-head">
              <span className="share-emoji">{emoji}</span>
              <div>
                <div className="share-name">Your page is ready, {name.trim()}!</div>
                <div className="share-meta">Share this link to start getting tips.</div>
              </div>
            </div>

            <div className="share-link-row">
              <input className="input share-input" readOnly value={shareUrl} />
              <button className="btn btn-primary" onClick={copy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="qr-block">
              <Qr value={shareUrl} size={180} />
              <span className="qr-cap">Or let people scan this</span>
            </div>

            <button
              className="btn btn-secondary btn-block"
              onClick={() => navigate(shareUrl.split('#')[1])}
            >
              Preview my page →
            </button>
          </div>
        ) : (
          <div className="incomplete">Fill in your name and UPI ID to generate your link.</div>
        )}
      </main>
    </div>
  )
}
