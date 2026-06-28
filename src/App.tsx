import { Landing } from './components/Landing'
import { EventFeedbackPage } from './components/EventFeedbackPage'
import { useLocation } from './router'

export default function App() {
  const { pathname } = useLocation()
  const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean)

  if (parts.length === 0 || parts[0] === 'admin') return <Landing />

  if (parts[0] === 'event' && parts[1]) {
    return <EventFeedbackPage slug={parts[1].toLowerCase()} />
  }

  return (
    <div className="page">
      <main className="empty-state rise rise-1">
        <span className="kicker">404</span>
        <h1 className="form-title">That TYSM link is not here.</h1>
        <p className="form-sub">Check the event URL and try again.</p>
      </main>
    </div>
  )
}
