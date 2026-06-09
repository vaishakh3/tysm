import { useMemo, useState } from 'react'
import { Brand } from './Brand'
import { AccountNav } from './AccountNav'
import { Qr } from './Qr'
import { navigate } from '../router'
import { buildUpiLink } from '../lib'
import { celebrate, pop } from '../confetti'
import type { TipProfile } from '../types'

function ShareStrip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const pageUrl = window.location.href.split('#')[0].replace(/\/$/, '') || window.location.href
  const text = `Tip ${name} on TYSM`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${pageUrl}`)}`
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`
  const copy = async () => {
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="share-strip rise rise-2">
      <span className="share-strip-label">Share this page</span>
      <div className="share-strip-btns">
        <a className="btn btn-ghost btn-sm" href={waUrl} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a className="btn btn-ghost btn-sm" href={twUrl} target="_blank" rel="noopener noreferrer">
          X / Twitter
        </a>
        <button className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

export function TipPage({
  profile,
  loading = false,
}: {
  profile: TipProfile | null
  loading?: boolean
}) {
  const [amount, setAmount] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')

  const effectiveAmount = useMemo(() => {
    if (custom.trim()) {
      const n = parseInt(custom.trim(), 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    return amount
  }, [custom, amount])

  const upiLink = useMemo(() => {
    if (!profile) return ''
    return buildUpiLink({
      upi: profile.upi,
      name: profile.name,
      amount: effectiveAmount ?? undefined,
      note: note.trim() || `TYSM ${profile.name}`,
    })
  }, [profile, effectiveAmount, note])

  if (loading) {
    return (
      <div className="page">
        <header className="topbar">
          <Brand tagline={false} />
        </header>
        <main className="empty-state">
          <div className="empty-emoji loading-pulse">💸</div>
          <p>Loading this page…</p>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page">
        <header className="topbar">
          <Brand tagline={false} />
        </header>
        <main className="empty-state">
          <div className="empty-emoji">🙈</div>
          <h2>This page isn’t here</h2>
          <p>The link may be mistyped, or this page doesn’t exist yet. Want to make your own?</p>
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Create a tip page
          </button>
        </main>
      </div>
    )
  }

  const selectPreset = (p: number) => {
    setAmount(p)
    setCustom('')
    pop(0.5, 0.55)
  }

  return (
    <div className="page">
      <header className="topbar rise rise-1">
        <Brand tagline={false} />
        <AccountNav
          signedOut={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/create')}>
              Make page
            </button>
          }
        />
      </header>

      <main className="tip-wrap">
        <div className="tip-card rise rise-1">
          <span className="stamp">TYSM</span>
          <div className={`tip-avatar ${profile.avatar ? 'tip-avatar-img' : ''}`}>
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} />
            ) : (
              profile.emoji || '😊'
            )}
          </div>
          <h1 className="tip-name">{profile.name}</h1>
          {profile.bio && <p className="tip-bio">{profile.bio}</p>}
          <div className="tip-prompt">Say thanks with a tip 💜</div>

          <div className="amount-grid">
            {profile.presets.map((p, i) => (
              <button
                key={`${p}-${i}`}
                className={`amount-btn ${amount === p && !custom ? 'amount-active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                ₹{p}
              </button>
            ))}
          </div>

          <div className="custom-row">
            <span className="rupee">₹</span>
            <input
              className="input custom-input"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Other amount"
              inputMode="numeric"
            />
          </div>

          <input
            className="input note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a thank-you note (optional)"
            maxLength={80}
          />

          <a
            className={`btn btn-primary btn-lg btn-block ${!effectiveAmount ? 'btn-disabled' : ''}`}
            href={effectiveAmount ? upiLink : undefined}
            aria-disabled={!effectiveAmount}
            onClick={() => effectiveAmount && celebrate()}
          >
            {effectiveAmount ? `Pay ₹${effectiveAmount} via UPI →` : 'Pick an amount'}
          </a>
          <div className="tip-hint">opens your UPI app — GPay, PhonePe, Paytm…</div>

          <details className="qr-fold">
            <summary>On a computer? Scan to pay →</summary>
            <div className="qr-block">
              {effectiveAmount ? (
                <>
                  <div className="qr-frame">
                    <Qr value={upiLink} size={172} />
                  </div>
                  <span className="qr-cap">scan with any UPI app to pay ₹{effectiveAmount}</span>
                </>
              ) : (
                <span className="qr-cap">pick an amount to generate a QR</span>
              )}
            </div>
          </details>
        </div>

        <ShareStrip name={profile.name} />

        <button className="link-btn" onClick={() => navigate('/create')}>
          Want tips too? <span>Make your own page →</span>
        </button>
      </main>
    </div>
  )
}
