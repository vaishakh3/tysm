import { Brand } from './Brand'
import { navigate } from '../useHashRoute'

const STEPS = [
  { emoji: '🙋', title: 'Create your page', text: 'Add your name + UPI ID. Takes 20 seconds.' },
  { emoji: '🔗', title: 'Share your link', text: 'Drop tysm.in/you in your bio, story, or invoice.' },
  { emoji: '💸', title: 'Get thanked', text: 'Fans tap an amount and pay you straight over UPI.' },
]

export function Landing() {
  return (
    <div className="page landing">
      <header className="topbar">
        <Brand />
        <button className="btn btn-ghost" onClick={() => navigate('/create')}>
          Create page
        </button>
      </header>

      <main className="hero">
        <div className="pill">UPI-native · no signup · no app</div>
        <h1>
          Let people say
          <br />
          <span className="grad-text">thank you so much</span>
          <br />
          with a tip.
        </h1>
        <p className="sub">
          Turn gratitude into income. Make a tipping page in seconds and get paid directly to your
          UPI — no payment gateway, no middleman, money lands in your account.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>
            Make my tip page →
          </button>
        </div>
        <div className="trust">Works with GPay · PhonePe · Paytm · any UPI app</div>
      </main>

      <section className="steps">
        {STEPS.map((s) => (
          <div className="step-card" key={s.title}>
            <div className="step-emoji" aria-hidden>
              {s.emoji}
            </div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span>TYSM · tip in two taps</span>
      </footer>
    </div>
  )
}
