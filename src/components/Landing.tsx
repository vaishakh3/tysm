import { Brand } from './Brand'
import { AccountNav } from './AccountNav'
import { navigate } from '../router'
import { encodeProfile } from '../lib'
import type { TipProfile } from '../types'

const STEPS = [
  {
    n: '01',
    title: 'Make your page',
    text: 'Add your name and UPI ID. No account, no setup — 20 seconds, done.',
  },
  {
    n: '02',
    title: 'Share one link',
    text: 'Drop it in your bio, story, invoice or WhatsApp. A QR comes free.',
  },
  {
    n: '03',
    title: 'Get thanked',
    text: 'People pick an amount and pay you straight over UPI. Money is yours.',
  },
]

const DEMO: TipProfile = {
  name: 'Aisha Verma',
  upi: 'aisha@okhdfcbank',
  bio: 'Illustrator drawing tiny comics. Buy me a chai ☕',
  emoji: '🎨',
  presets: [49, 99, 199],
}

export function Landing() {
  const demoRoute = `#/t/${encodeProfile(DEMO)}`

  return (
    <div className="page landing">
      <header className="topbar rise rise-1">
        <Brand />
        <AccountNav
          signedOut={
            <button className="btn btn-ghost" onClick={() => navigate('/create')}>
              Make page
            </button>
          }
        />
      </header>

      <main className="hero">
        <span className="kicker rise rise-1">UPI-native · no signup · no cut</span>
        <h1 className="rise rise-2">
          Get tipped in
          <span className="thanks">thank&#8209;yous.</span>
        </h1>
        <p className="sub rise rise-3">
          TYSM turns gratitude into income. Spin up a tipping page in seconds and get paid straight
          to your UPI — no gateway, no middleman, no app to download.
        </p>
        <div className="cta-row rise rise-3">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>
            Make my tip page →
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate(demoRoute)}>
            See an example
          </button>
        </div>
        <div className="trust rise rise-4">
          <b>Works with</b> GPay · PhonePe · Paytm · any UPI app
        </div>
      </main>

      <section className="steps rise rise-5">
        {STEPS.map((s) => (
          <div className="step-row" key={s.n}>
            <span className="step-num">{s.n}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span>TYSM · {new Date().getFullYear()}</span>
        <span>tip in two taps</span>
      </footer>
    </div>
  )
}
