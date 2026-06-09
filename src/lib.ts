import type { TipProfile } from './types'

/** Base64url encode a UTF-8 string (URL-safe, no padding). */
function b64urlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decode a base64url string back to UTF-8. */
function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Encode a profile into a compact, self-contained token for a share link. */
export function encodeProfile(profile: TipProfile): string {
  const compact = {
    n: profile.name,
    u: profile.upi,
    b: profile.bio || undefined,
    e: profile.emoji || undefined,
    p: profile.presets,
  }
  return b64urlEncode(JSON.stringify(compact))
}

/** Decode a share token back into a profile, or null if malformed. */
export function decodeProfile(token: string): TipProfile | null {
  try {
    const raw = JSON.parse(b64urlDecode(token)) as {
      n?: unknown
      u?: unknown
      b?: unknown
      e?: unknown
      p?: unknown
    }
    if (typeof raw.n !== 'string' || typeof raw.u !== 'string') return null
    const presets = Array.isArray(raw.p)
      ? raw.p.filter((x): x is number => typeof x === 'number' && x > 0)
      : []
    return {
      name: raw.n,
      upi: raw.u,
      bio: typeof raw.b === 'string' ? raw.b : undefined,
      emoji: typeof raw.e === 'string' ? raw.e : undefined,
      presets: presets.length ? presets : [49, 99, 199],
    }
  } catch {
    return null
  }
}

/** Basic VPA validation: handle@bank, no spaces. */
export function isValidUpi(upi: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/.test(upi.trim())
}

/**
 * Build a UPI deep link that opens the payer's UPI app prefilled.
 * Spec: https://www.npci.org.in/what-we-do/upi/product-overview
 */
export function buildUpiLink(opts: {
  upi: string
  name: string
  amount?: number
  note?: string
}): string {
  const params = new URLSearchParams()
  params.set('pa', opts.upi.trim())
  params.set('pn', opts.name.trim())
  if (opts.amount && opts.amount > 0) params.set('am', opts.amount.toFixed(2))
  params.set('cu', 'INR')
  if (opts.note) params.set('tn', opts.note.slice(0, 80))
  return `upi://pay?${params.toString()}`
}

/** Build a full share URL for a profile token using the current origin. */
export function buildShareUrl(token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/t/${token}`
}
