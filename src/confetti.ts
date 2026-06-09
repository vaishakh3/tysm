import confetti from 'canvas-confetti'

const COLORS = ['#d4ff3f', '#ff6a45', '#ff8fa3', '#f6f2e9']

/** A celebratory burst from the bottom-center, themed to TYSM. */
export function celebrate(): void {
  const defaults = { colors: COLORS, disableForReducedMotion: true }
  confetti({ ...defaults, particleCount: 70, spread: 75, startVelocity: 48, origin: { y: 0.85 } })
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 40, spread: 100, scalar: 0.9, origin: { y: 0.9 } })
  }, 140)
}

/** A small, quick pop near a point (0..1 coords) — used for selections. */
export function pop(x = 0.5, y = 0.5): void {
  confetti({
    colors: COLORS,
    disableForReducedMotion: true,
    particleCount: 26,
    spread: 60,
    startVelocity: 32,
    scalar: 0.8,
    ticks: 90,
    origin: { x, y },
  })
}
