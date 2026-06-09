import { useMemo, useState } from 'react'
import { Brand } from './Brand'
import { Qr } from './Qr'
import { navigate } from '../useHashRoute'
import { buildUpiLink } from '../lib'
import type { TipProfile } from '../types'

export function TipPage({ profile }: { profile: TipProfile | null }) {
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

  if (!profile) {
    return (
      <div className="page">
        <header className="topbar">
          <Brand tagline={false} />
        </header>
        <main className="empty-state">
          <div className="empty-emoji">🙈</div>
          <h2>This tip link looks broken</h2>
          <p>The link may be incomplete or mistyped. Want to make your own instead?</p>
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Create a tip page
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <Brand tagline={false} />
      </header>

      <main className="tip-wrap">
        <div className="tip-card">
          <div className="tip-avatar">{profile.emoji || '😊'}</div>
          <h1 className="tip-name">{profile.name}</h1>
          {profile.bio && <p className="tip-bio">{profile.bio}</p>}
          <div className="tip-prompt">Say thanks with a tip 💜</div>

          <div className="amount-grid">
            {profile.presets.map((p) => (
              <button
                key={p}
                className={`amount-btn ${amount === p && !custom ? 'amount-active' : ''}`}
                onClick={() => {
                  setAmount(p)
                  setCustom('')
                }}
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
          >
            {effectiveAmount ? `Pay ₹${effectiveAmount} via UPI` : 'Pick an amount'}
          </a>
          <div className="tip-hint">Opens your UPI app (GPay, PhonePe, Paytm…)</div>

          <details className="qr-fold">
            <summary>On a computer? Scan to pay</summary>
            <div className="qr-block">
              {effectiveAmount ? (
                <>
                  <Qr value={upiLink} size={180} />
                  <span className="qr-cap">Scan with any UPI app to pay ₹{effectiveAmount}</span>
                </>
              ) : (
                <span className="qr-cap">Pick an amount to generate a QR.</span>
              )}
            </div>
          </details>
        </div>

        <button className="link-btn" onClick={() => navigate('/create')}>
          Want tips too? Make your own page →
        </button>
      </main>
    </div>
  )
}
