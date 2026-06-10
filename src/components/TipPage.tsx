import { useMemo, useState } from 'react'
import { Brand } from './Brand'
import { AccountNav } from './AccountNav'
import { Qr } from './Qr'
import { navigate } from '../router'
import { buildUpiLink } from '../lib'
import { celebrate, pop } from '../confetti'
import type { TipProfile } from '../types'

const IS_MOBILE =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** P2P QR share-&-pay is capped at ₹2,000 per NPCI rules. */
const QR_P2P_LIMIT = 2000

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
  const [upiCopied, setUpiCopied] = useState(false)
  const [amtCopied, setAmtCopied] = useState(false)

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

  const copyUpi = async () => {
    if (!profile) return
    await navigator.clipboard.writeText(profile.upi)
    setUpiCopied(true)
    pop(0.5, 0.6)
    setTimeout(() => setUpiCopied(false), 1800)
  }

  const copyAmount = async () => {
    if (!effectiveAmount) return
    await navigator.clipboard.writeText(String(effectiveAmount))
    setAmtCopied(true)
    setTimeout(() => setAmtCopied(false), 1800)
  }

  const overQrLimit = !!effectiveAmount && effectiveAmount > QR_P2P_LIMIT

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

          {effectiveAmount ? (
            <div className="pay-panel">
              <div className="qr-block">
                <div className="qr-frame">
                  <Qr value={upiLink} size={196} />
                </div>
                <span className="qr-cap">
                  {IS_MOBILE
                    ? 'Press & hold to save, then open your UPI app → Scan → from Gallery'
                    : `Scan with any UPI app to pay ₹${effectiveAmount}`}
                </span>
              </div>

              <div className="pay-or">
                <span>or pay to this UPI ID</span>
              </div>

              <button
                className={`copy-field ${upiCopied ? 'copy-field-done' : ''}`}
                onClick={copyUpi}
              >
                <span className="copy-field-val">{profile.upi}</span>
                <span className="copy-field-act">{upiCopied ? 'Copied ✓' : 'Copy'}</span>
              </button>

              <ol className="pay-steps">
                <li>Open GPay, PhonePe or Paytm</li>
                <li>
                  Tap <b>Pay to UPI ID</b> &amp; paste it
                </li>
                <li>
                  Enter{' '}
                  <button className="amt-chip" onClick={copyAmount}>
                    ₹{effectiveAmount} {amtCopied ? '✓' : '⧉'}
                  </button>{' '}
                  and send
                </li>
              </ol>

              {IS_MOBILE && (
                <a
                  className="btn btn-ghost btn-sm btn-block"
                  href={upiLink}
                  onClick={() => celebrate()}
                >
                  Try opening a UPI app →
                </a>
              )}

              <p className="pay-note">
                {overQrLimit
                  ? 'Over ₹2,000 — the QR may be declined for personal UPI IDs. Use the “Pay to UPI ID” steps above instead.'
                  : 'Personal UPI IDs can’t accept app-to-app payment links (an NPCI rule since Apr 2024) — pay by scanning the QR or entering the UPI ID.'}
              </p>
            </div>
          ) : (
            <div className="pay-panel-empty">
              <span className="qr-cap">Pick an amount to get the QR &amp; UPI ID</span>
            </div>
          )}
        </div>

        <ShareStrip name={profile.name} />

        <button className="link-btn" onClick={() => navigate('/create')}>
          Want tips too? <span>Make your own page →</span>
        </button>
      </main>
    </div>
  )
}
