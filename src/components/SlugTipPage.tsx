import { useEffect, useState } from 'react'
import { TipPage } from './TipPage'
import { getCreatorBySlug } from '../db'
import type { TipProfile } from '../types'

/** Resolves a vanity slug to a creator profile from Supabase. */
export function SlugTipPage({ slug }: { slug: string }) {
  const [result, setResult] = useState<{ slug: string; profile: TipProfile | null } | null>(null)

  useEffect(() => {
    let active = true
    getCreatorBySlug(slug).then((profile) => {
      if (active) setResult({ slug, profile })
    })
    return () => {
      active = false
    }
  }, [slug])

  const loading = result?.slug !== slug
  return <TipPage profile={loading ? null : result.profile} loading={loading} />
}
