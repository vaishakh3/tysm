import { navigate } from '../useHashRoute'

export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <button className="brand" onClick={() => navigate('/')} aria-label="TYSM home">
      <span className="brand-mark" aria-hidden>
        TYSM
      </span>
      {tagline && <span className="brand-tag">thank you so much</span>}
    </button>
  )
}
