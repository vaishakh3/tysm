/** Star rating — interactive when onChange is provided, else read-only. */
export function Stars({
  value,
  onChange,
  size = 22,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  const interactive = typeof onChange === 'function'
  return (
    <div className={`stars ${interactive ? 'stars-interactive' : ''}`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        if (!interactive) {
          return (
            <span key={n} className={`star ${filled ? 'star-on' : ''}`} aria-hidden>
              ★
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            className={`star ${filled ? 'star-on' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
