import { navigate } from '../router'

export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <button className="brand" onClick={() => navigate('/')} aria-label="TYSM home">
      <span className="brand-mark">
        TY<b>SM</b>
      </span>
      {tagline && <span className="brand-tag">event feedback</span>}
    </button>
  )
}
