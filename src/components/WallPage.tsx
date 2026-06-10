import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { Brand } from './Brand'
import { Stars } from './Stars'
import { navigate } from '../router'
import { getApprovedTestimonials, getSpaceBySlug } from '../testimonials'
import type { Space, Testimonial } from '../types'

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="wall-card">
      <Stars value={t.rating} size={16} />
      <blockquote>{t.message}</blockquote>
      <figcaption>
        <span className="wall-avatar">{t.authorName.charAt(0).toUpperCase()}</span>
        <span className="wall-meta">
          <b>{t.authorName}</b>
          {t.authorRole && <small>{t.authorRole}</small>}
        </span>
      </figcaption>
    </figure>
  )
}

/** Public "wall of love" for a space. `embed` strips page chrome for iframes. */
export function WallPage({ slug, embed = false }: { slug: string; embed?: boolean }) {
  const [state, setState] = useState<{
    slug: string
    space: Space | null
    items: Testimonial[]
  } | null>(null)

  useEffect(() => {
    let active = true
    getSpaceBySlug(slug).then(async (space) => {
      if (!space) {
        if (active) setState({ slug, space: null, items: [] })
        return
      }
      const items = await getApprovedTestimonials(space.id)
      if (active) setState({ slug, space, items })
    })
    return () => {
      active = false
    }
  }, [slug])

  // In embed mode, report height to the host page so the iframe can auto-resize.
  useLayoutEffect(() => {
    if (!embed) return
    const post = () =>
      window.parent?.postMessage(
        { type: 'tysm-embed-height', slug, height: document.body.scrollHeight },
        '*',
      )
    post()
    const ro = new ResizeObserver(post)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [embed, slug, state])

  const loading = state?.slug !== slug
  const space = loading ? null : state?.space
  const items = state?.items ?? []
  const accent = { '--accent': space?.color || '#d4ff3f' } as CSSProperties

  if (loading) {
    return (
      <div className={embed ? 'embed-root' : 'page'}>
        <main className="empty-state">
          <div className="empty-emoji loading-pulse">💬</div>
        </main>
      </div>
    )
  }

  if (!space) {
    return (
      <div className={embed ? 'embed-root' : 'page'}>
        <main className="empty-state">
          <div className="empty-emoji">🙈</div>
          <h2>No wall here</h2>
        </main>
      </div>
    )
  }

  const grid =
    items.length > 0 ? (
      <div className="wall-grid">
        {items.map((t) => (
          <Card key={t.id} t={t} />
        ))}
      </div>
    ) : (
      <div className="wall-empty">
        <div className="empty-emoji">🌱</div>
        <p>No testimonials yet — be the first to say thanks.</p>
        <button className="btn btn-secondary btn-sm accent-btn" onClick={() => navigate(`/c/${slug}`)}>
          Leave a testimonial →
        </button>
      </div>
    )

  if (embed) {
    return (
      <div className="embed-root" style={accent}>
        {grid}
        <a className="embed-credit" href="https://www.tysm.in" target="_blank" rel="noopener noreferrer">
          ★ Collected with TYSM
        </a>
      </div>
    )
  }

  return (
    <div className="page" style={accent}>
      <header className="topbar rise rise-1">
        <Brand tagline={false} />
        <button className="btn btn-ghost btn-sm accent-btn" onClick={() => navigate(`/c/${slug}`)}>
          Add yours →
        </button>
      </header>
      <main className="wall-main">
        <div className="wall-head rise rise-2">
          <span className="kicker">Wall of love</span>
          <h1>
            What people say about <span className="accent-text">{space.name}</span>
          </h1>
        </div>
        <div className="rise rise-3">{grid}</div>
      </main>
    </div>
  )
}
