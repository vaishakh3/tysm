export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'create',
  'dashboard',
  'embed',
  'event',
  'events',
  'feedback',
  'index.html',
  'login',
  'privacy',
  'settings',
  'signup',
  'terms',
])

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,59}$/.test(slug) && !RESERVED_SLUGS.has(slug)
}

export function buildEventUrl(slug: string): string {
  return `${window.location.origin}/event/${slug}`
}

export function formatEventDate(date: string | undefined): string {
  if (!date) return 'No date'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function averageRating(ratings: number[]): string {
  if (ratings.length === 0) return '0.0'
  const total = ratings.reduce((sum, rating) => sum + rating, 0)
  return (total / ratings.length).toFixed(1)
}
